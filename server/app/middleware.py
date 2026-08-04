"""Pure-ASGI middleware registered in app.main.

Pure ASGI on purpose: @app.middleware("http") means BaseHTTPMiddleware,
whose streaming shim wraps every response — and all static delivery here
is FileResponse via the SPA catch-all. Mutating http.response.start
leaves FileResponse untouched.
"""

import logging
import sys

# Sent on every response — API JSON, static assets, the SPA shell, and
# HTTPException 404s alike — which also keeps /docs indistinguishable from
# unknown paths at the header level. The CSP is deliberately minimal: the
# AdSense loader pulls scripts/frames/pixels from Google origins that are not
# knowable in advance (and can change from the dashboard with no code change
# here), so script-src/img-src/connect-src/frame-src/style-src are omitted
# rather than allowlisted — with no default-src, omitted directives stay
# unrestricted, and nothing listed below can break ad delivery. The values
# are mirrored as hardcoded literals in tests/test_security_headers.py,
# which is the guard against silent edits.
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": (
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    ),
    "Content-Security-Policy": (
        "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; "
        "form-action 'self'"
    ),
}
_SECURITY_HEADERS_RAW = [
    (name.lower().encode(), value.encode())
    for name, value in SECURITY_HEADERS.items()
]


class SecurityHeadersMiddleware:
    """Append the security headers to every HTTP response."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                message["headers"] = [
                    *message.get("headers", []),
                    *_SECURITY_HEADERS_RAW,
                ]
            await send(message)

        await self.app(scope, receive, send_with_headers)


# The ONLY request log: uvicorn's own access log is disabled with
# --no-access-log in every entry point (Dockerfile CMD, root package.json
# server/start scripts) because behind Railway it can only ever show the
# internal CGNAT peer (100.64.0.x). If this middleware breaks or is removed,
# request visibility drops to zero — tests/test_access_log.py guards against
# that. Self-contained handler + propagate=False so output is deterministic
# regardless of uvicorn's logging config.
access_log = logging.getLogger("app.access")
access_log.setLevel(logging.INFO)
access_log.addHandler(logging.StreamHandler(sys.stdout))
access_log.propagate = False

# Path, query, User-Agent, and CF-Connecting-IP are attacker-controlled and
# uvicorn percent-decodes the request target, so the path can contain ANY
# byte (%22 arrives as a literal quote, %0d%0a as a literal CRLF) — enough
# to forge fields or inject entire fake log lines. Escaped nginx-style
# rather than replaced because this log exists for scanner forensics: the
# probe payload is the part worth reading, and escaping preserves it while
# keeping lines single-line and parseable. C1 controls included: latin-1
# decoding maps bytes 0x80-0x9f onto them.
_ESCAPES = {ord("\\"): "\\\\", ord('"'): '\\"'}
_ESCAPES.update(
    {c: f"\\x{c:02x}" for c in (*range(0x20), 0x7F, *range(0x80, 0xA0))}
)
# The client field also escapes spaces: a real IP never contains one, and an
# unescaped space is what would let a spoofed header like "1.2.3.4 (direct)"
# impersonate the genuine " (direct)" marker appended below — the one field
# read as a signal, not just as text.
_CLIENT_ESCAPES = {**_ESCAPES, 0x20: "\\x20"}


def _clean(value, cap, escapes=_ESCAPES):
    """Truncate to cap (raw), then escape — worst case 4x cap, still one line."""
    if len(value) > cap:
        value = value[:cap] + "[truncated]"
    return value.translate(escapes)


class AccessLogMiddleware:
    """One uvicorn-lookalike line per response, with the real client IP.

    CF-Connecting-IP is overwritten unconditionally by Cloudflare, unlike
    X-Forwarded-For, which Cloudflare appends to (leftmost entry stays
    client-spoofable — why uvicorn --proxy-headers is not the answer). A
    request without the header did not come through Cloudflare (Railway
    healthcheck, dev proxy, direct-to-origin) and gets the peer address
    tagged "(direct)". Log-only: never use this value for access control —
    nothing stops a direct-to-origin client from forging the header.

    All attacker-controlled fields pass through _clean() before formatting;
    the method needs no cleaning (the HTTP parser rejects non-token methods
    before ASGI) and the status is server-generated.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope["headers"])
        cf_ip = headers.get(b"cf-connecting-ip")
        if cf_ip is not None:
            client = _clean(cf_ip.decode("latin-1"), 64, _CLIENT_ESCAPES)
        else:
            # Peer host is transport-provided, but cleaning it too means the
            # marker appended here is the only unescaped "(direct)" possible.
            peer = scope.get("client")
            host = _clean(peer[0] if peer else "-", 64, _CLIENT_ESCAPES)
            client = f"{host} (direct)"
        target = scope["path"]
        query = scope.get("query_string", b"")
        if query:
            target = f"{target}?{query.decode('latin-1')}"
        target = _clean(target, 500)
        user_agent = _clean(
            headers.get(b"user-agent", b"-").decode("latin-1"), 256
        )

        async def send_and_log(message):
            if message["type"] == "http.response.start":
                access_log.info(
                    '%s - "%s %s" %s "%s"',
                    client,
                    scope["method"],
                    target,
                    message["status"],
                    user_agent,
                )
            await send(message)

        await self.app(scope, receive, send_and_log)

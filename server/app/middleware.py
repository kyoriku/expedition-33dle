"""Pure-ASGI middleware registered in app.main.

Pure ASGI on purpose: @app.middleware("http") means BaseHTTPMiddleware,
whose streaming shim wraps every response — and all static delivery here
is FileResponse via the SPA catch-all. Mutating http.response.start
leaves FileResponse untouched.
"""

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

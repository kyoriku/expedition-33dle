"""Security headers land on every response, added by pure-ASGI middleware.

The repo's usual pattern — awaiting handlers directly — bypasses the
middleware stack entirely and cannot see these headers, so these tests
drive app.main.app as an ASGI callable instead: still no HTTP client,
still asyncio.run. Expected values are hardcoded literals on purpose
(the storage.test.ts approach): the test is the guard against silent
edits to SECURITY_HEADERS, so it must not import it.
"""

import asyncio

EXPECTED_HEADERS = {
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-frame-options": "DENY",
    "permissions-policy": (
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    ),
    "content-security-policy": (
        "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; "
        "form-action 'self'"
    ),
}


def _get(path):
    import app.main

    messages = []

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        messages.append(message)

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "root_path": "",
        "headers": [],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
    }
    asyncio.run(app.main.app(scope, receive, send))
    start = next(m for m in messages if m["type"] == "http.response.start")
    headers = {
        name.decode().lower(): value.decode()
        for name, value in start["headers"]
    }
    return start["status"], headers


def test_api_response_carries_security_headers():
    status, headers = _get("/api/health")
    assert status == 200
    for name, value in EXPECTED_HEADERS.items():
        assert headers.get(name) == value, name


def test_spa_fallback_carries_security_headers():
    # Build-independent, like test_sentry's indistinguishability test: with
    # a client build this serves index.html (200), without one a JSON 404
    # from ExceptionMiddleware — which sits inside user middleware, so the
    # headers must be present either way.
    status, headers = _get("/zzz-no-such-page")
    assert status in (200, 404)
    for name, value in EXPECTED_HEADERS.items():
        assert headers.get(name) == value, name

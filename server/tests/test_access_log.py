"""AccessLogMiddleware is the ONLY request log — uvicorn's access log is
disabled with --no-access-log in every entry point — so these tests are
the guard against losing request visibility silently.

Same ASGI-driving approach as test_security_headers (direct handler
awaits never touch middleware). Records are captured with a handler
attached straight to the logger: propagate=False keeps them away from
pytest's caplog, which listens on the root logger.
"""

import asyncio
import logging


def _get(path, query=b"", request_headers=()):
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
        "query_string": query,
        "root_path": "",
        "headers": list(request_headers),
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
    }
    asyncio.run(app.main.app(scope, receive, send))


def _capture(path, query=b"", request_headers=()):
    from app.middleware import access_log

    records = []
    handler = logging.Handler()
    handler.emit = records.append
    access_log.addHandler(handler)
    try:
        _get(path, query=query, request_headers=request_headers)
    finally:
        access_log.removeHandler(handler)
    return [record.getMessage() for record in records]


def test_cf_connecting_ip_method_path_status_and_ua_are_logged():
    lines = _capture(
        "/api/health",
        request_headers=[
            (b"cf-connecting-ip", b"203.0.113.7"),
            (b"user-agent", b"zgrab/0.x"),
        ],
    )
    assert lines == ['203.0.113.7 - "GET /api/health" 200 "zgrab/0.x"']


def test_missing_cf_header_falls_back_to_peer_tagged_direct():
    # No CF-Connecting-IP means the request did not come through Cloudflare
    # (Railway healthcheck, dev proxy, or a direct-to-origin prober) — the
    # transport peer is logged and marked so those stand out.
    lines = _capture("/api/health")
    assert lines == ['testclient (direct) - "GET /api/health" 200 "-"']


def test_query_string_is_included():
    lines = _capture(
        "/api/health",
        query=b"probe=1",
        request_headers=[(b"cf-connecting-ip", b"203.0.113.7")],
    )
    assert lines == ['203.0.113.7 - "GET /api/health?probe=1" 200 "-"']


# Injection cases: path, query, User-Agent, and CF-Connecting-IP are
# attacker-controlled, and uvicorn percent-decodes the request target, so
# the path can contain any byte — including quotes and CRLF (a real prober
# broke the line format with %22 before _clean() existed). The paths below
# sit under /api/ because unmatched /api/* is a 404 in every environment,
# keeping the exact-line assertions build-independent.


def test_quotes_in_path_are_escaped():
    lines = _capture(
        '/api/"probe"',
        request_headers=[(b"cf-connecting-ip", b"203.0.113.7")],
    )
    assert lines == ['203.0.113.7 - "GET /api/\\"probe\\"" 404 "-"']


def test_crlf_in_path_cannot_forge_a_second_line():
    lines = _capture(
        "/api/x\r\n10.0.0.1 - \"GET /forged\" 200 \"-\"",
        request_headers=[(b"cf-connecting-ip", b"203.0.113.7")],
    )
    assert len(lines) == 1
    assert "\n" not in lines[0] and "\r" not in lines[0]
    assert lines[0] == (
        '203.0.113.7 - "GET /api/x\\x0d\\x0a10.0.0.1 - '
        '\\"GET /forged\\" 200 \\"-\\"" 404 "-"'
    )


def test_overlong_user_agent_is_truncated():
    lines = _capture(
        "/api/health",
        request_headers=[
            (b"cf-connecting-ip", b"203.0.113.7"),
            (b"user-agent", b"a" * 300),
        ],
    )
    expected_ua = "a" * 256 + "[truncated]"
    assert lines == [f'203.0.113.7 - "GET /api/health" 200 "{expected_ua}"']


def test_crafted_cf_connecting_ip_cannot_forge_fields():
    lines = _capture(
        "/api/health",
        request_headers=[(b"cf-connecting-ip", b'203.0.113.7" 200 "GET /fake')],
    )
    assert len(lines) == 1
    assert lines[0] == (
        '203.0.113.7\\"\\x20200\\x20\\"GET\\x20/fake'
        ' - "GET /api/health" 200 "-"'
    )


def test_cf_connecting_ip_cannot_spoof_the_direct_marker():
    # A space is escaped in the client field only — a real IP never contains
    # one, so " (direct)" appended by the middleware stays unforgeable.
    lines = _capture(
        "/api/health",
        request_headers=[(b"cf-connecting-ip", b"1.2.3.4 (direct)")],
    )
    assert lines == ['1.2.3.4\\x20(direct) - "GET /api/health" 200 "-"']

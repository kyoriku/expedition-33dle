"""App startup with Sentry unconfigured, and the sentry settings fields.

conftest.py strips SENTRY_DSN from the environment, so importing app.main
must skip sentry_sdk.init() entirely — no client, no patching, no network —
and leave the existing routes untouched. Handlers are called directly, per
the repo's no-HTTP-client test pattern; app.main imports live inside the
tests so a broken import fails a named test instead of collection.
"""

import asyncio
import os

import pytest
from fastapi import HTTPException

from app.settings import Settings


def test_sentry_dsn_is_neutralized_in_test_env():
    # conftest overwrites with "" (not pop) so it also shadows a stray
    # local server/.env; main.py's gate treats "" as unset.
    assert os.environ.get("SENTRY_DSN", "") == ""


def test_app_imports_without_initializing_sentry():
    import sentry_sdk

    import app.main  # noqa: F401 — the import is the exercise

    assert not sentry_sdk.is_initialized()


def test_health_handler_unaffected():
    from app.main import health

    assert health() == {"status": "ok"}


def test_spa_fallback_still_rejects_api_paths():
    from app.main import spa

    with pytest.raises(HTTPException) as exc:
        asyncio.run(spa("api/definitely-not-a-route"))
    assert exc.value.status_code == 404
    assert exc.value.detail == "Not found"


def test_boom_disarmed_is_a_plain_404(monkeypatch):
    import app.main

    monkeypatch.setattr(app.main.settings, "boom_enabled", None)
    with pytest.raises(HTTPException) as exc:
        app.main.boom()
    assert exc.value.status_code == 404
    assert exc.value.detail == "Not found"


def test_boom_absent_from_openapi_schema():
    # The public /openapi.json must not advertise the pipeline check —
    # disarmed, the route has to look like it does not exist at all.
    import app.main

    assert "/api/_boom" not in app.main.app.openapi()["paths"]


def test_boom_armed_raises(monkeypatch):
    import app.main

    monkeypatch.setattr(app.main.settings, "boom_enabled", "1")
    with pytest.raises(RuntimeError):
        app.main.boom()


def test_settings_sentry_fields_default_off(monkeypatch):
    monkeypatch.delenv("SENTRY_DSN", raising=False)  # conftest sets it to ""
    monkeypatch.delenv("SENTRY_ENVIRONMENT", raising=False)
    monkeypatch.delenv("BOOM_ENABLED", raising=False)
    s = Settings(database_url="postgresql+asyncpg://t:t@localhost/t")
    assert s.sentry_dsn is None
    assert s.sentry_environment == "development"
    assert s.boom_enabled is None

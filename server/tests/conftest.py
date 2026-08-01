"""Shared test setup.

`app.db` constructs an async engine at import time from `DATABASE_URL`, so the
variable must exist before any `app.*` import that pulls in the DB layer (the
endpoint tests do). Engine *creation* never opens a connection, so a dummy URL
is sufficient for the unit/handler tests here — none of them touch a real DB.
"""

import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test"
)

# Sentry must never activate under test: app.main initializes the SDK at
# import time when SENTRY_DSN is set, so a DSN leaked from a shell would
# patch the app and send real events. Overwrite with "" rather than pop —
# env vars outrank the env_file source in pydantic-settings, so this also
# shadows a DSN in a stray local server/.env; main.py treats "" as unset.
os.environ["SENTRY_DSN"] = ""

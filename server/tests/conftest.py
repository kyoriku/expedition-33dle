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

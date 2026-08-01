#!/bin/sh
# Railway pre-deploy: migrate, then seed (guarded — see seed.py's docstring).
# A wrapper script instead of a chained preDeployCommand string: two deploys
# showed the "a && b" form running alembic but never reaching seed while still
# exiting 0. set -e makes any step's failure fail the deploy; the banners give
# positive confirmation in the deploy logs (stderr — the stream Railway shows).
set -e
echo "predeploy: alembic upgrade head" >&2
uv run --no-sync alembic upgrade head
echo "predeploy: seeding" >&2
uv run --no-sync python scripts/seed.py
echo "predeploy: complete" >&2

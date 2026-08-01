# Deployment runbook

Single Railway service (FastAPI serves the API and the built SPA — see the
`Dockerfile`), Postgres alongside it, Cloudflare in front as DNS + proxy +
edge cache. Domain registered at Porkbun. Manual steps only; everything
automatable lives in `Dockerfile` / `railway.json` / `scripts/seed.py`.

## 1. Railway

1. railway.com → New Project → **Deploy from GitHub repo** → this repo, `main`
   branch. Railway picks up the `Dockerfile` and `railway.json` automatically.
2. Add a **PostgreSQL** service to the same project. Enable **backups** on it.
3. App service → Variables: `DATABASE_URL = ${{Postgres.DATABASE_URL}}`.
   (The scheme is normalized to `postgresql+asyncpg://` in `app/settings.py` —
   no need to hand-compose the URL.)
4. App service → Settings → Networking → **Generate Domain** for a
   `*.up.railway.app` URL to test against before DNS.
5. **Positive confirmation after every deploy** (railway.json is silently
   ignored if malformed — verify, don't assume):
   - Settings shows healthcheck path `/api/health` populated.
   - Deploy logs show all three `predeploy:` banners — `alembic upgrade head`,
     `seeding` (followed by the four seed count lines, `bosses ... total: 50`),
     and `complete`. A missing `predeploy: complete` means seed did not run —
     do not point DNS at a deploy without it.
   - Note: Railway private networking takes a few seconds to come up at
     container start — a first-attempt alembic connection failure in
     pre-deploy is that, not the URL scheme.

### CI gate (tests must pass before deploy)

`.github/workflows/tests.yml` runs both suites (pytest + vitest) on every
push to main and every PR. To make a red run **block the deploy**: Railway →
app service → Settings → enable **Wait for CI**. Railway then holds the
build until the commit's GitHub checks succeed. Optional extra: GitHub
branch protection on `main` requiring the `tests` checks before merge.

Until 2026-08-01 UTC the 28 wall-clock endpoint tests are red by choice
(pre-launch, routers correctly raise PuzzleNotYetAvailable) — the first
green run happens on launch day.

### Verify on the Railway domain (before DNS)

- `curl https://<app>.up.railway.app/api/health` → `{"status":"ok"}`
- `/api/bosses/today` → 50-boss roster, image fields populated
- Browser: play one mode start to finish; images render
- Direct navigation to `/privacy` renders (SPA fallback)
- `/api/nope` → JSON 404 (not the HTML shell)

## 2. DNS: Porkbun → Cloudflare → Railway

> **LAUNCH_DATE is only truly frozen once real players hold local streak
> state — the Cloudflare CNAME cutover is the last point at which it can
> still be changed.** If launch slips past 2026-08-01: bump `LAUNCH_DATE`
> in `server/app/constants.py`, redeploy, *then* point DNS — that gives a
> clean puzzle #1 on the real launch day.

1. Cloudflare → Add site → `expedition33dle.com` (Free plan). Discard any
   auto-imported DNS records. Note the two assigned nameservers.
2. Porkbun → domain → Nameservers → replace with the Cloudflare pair
   (WHOIS privacy stays on; nothing else at Porkbun matters after delegation).
3. Railway → app service → Settings → Networking → add custom domains
   `expedition33dle.com` **and** `www.expedition33dle.com`; copy the issued
   CNAME targets.
4. Cloudflare → DNS: `CNAME @ → <target>` and `CNAME www → <target>`, both
   **Proxied** (Cloudflare flattens the apex CNAME).
5. Cloudflare → SSL/TLS: mode **Full (strict)**; enable **Always Use HTTPS**.
   If Railway's cert verification stalls behind the proxy: gray-cloud the
   records, wait for Railway to verify, re-enable the proxy.
6. Redirect rule: `www.expedition33dle.com/*` → 301 →
   `https://expedition33dle.com/$1`.

## 3. Cloudflare cache rules

Bypass rules listed first for legibility (the path patterns don't overlap, so
ordering isn't load-bearing):

1. **`/api/*` → Bypass cache.** Load-bearing: `/api/<mode>/today` rolls over
   at UTC midnight, and a cached response would serve a stale answer with no
   client-side signal.
2. **The SPA document (`/`, `/classic`, … — i.e. everything serving
   `index.html`) → Bypass cache.** A cached document pins an old bundle hash.
3. **`/assets/*` → Cache Eligible, Edge TTL 1 year, Browser TTL 1 year.**
   Content-hashed filenames; immutable.
4. **`/portraits/*` OR `/pictos/*` OR `/weapons/*` OR `/bosses/*` OR
   `/fonts/*` → Cache Eligible, Edge TTL 7 days, Browser TTL 1 day.**
   Not content-hashed: **replacing an image requires a Cloudflare purge of
   that URL.**

Browser TTL matters on 3 and 4 because FastAPI's static file responses send
`etag`/`last-modified` but no `Cache-Control: max-age` — without it you get
edge caching and no browser caching.

### Verify on the prod domain

- `dig NS expedition33dle.com` → Cloudflare nameservers
- `curl -I https://expedition33dle.com` → `cf-ray` header present
- Second fetch of an image URL → `cf-cache-status: HIT`
- `/api/classic/today` → `cf-cache-status: BYPASS` (or `DYNAMIC`)
- `http://` and `www.` both 301 to the `https://` apex
- Full game end-to-end on launch day (2026-08-01 UTC = puzzle #1)

## Standing rules

**Frozen forever** (any change reshuffles every historical daily answer):
roster names (add/remove/rename in any mode), `SHUFFLE_SEED`, the per-mode
salts, `LAUNCH_DATE`, the scheduling algorithm.

The seed guard enforces this at deploy time. Its escape path, in order:
1. **Pin elapsed days' answers first** (a table of date → answer, served for
   past days; the pure function takes over going forward).
2. Edit `EXPECTED_COUNTS` in `server/scripts/seed.py`.
3. Set `ALLOW_SEED_PRUNE=1` on that deploy **only if the change also removes
   entries**. `ALLOW_SEED_PRUNE` does **not** bypass the count check.

**Freely editable live**: every attribute value and every image — reseed
(deploy) and, for a replaced image, purge its URL from Cloudflare's cache.

**Additive any time**: logging, rate limiting, security headers.

## Day-2 TODO (out of scope for this branch)

- Cloudflare rate-limiting rule on `/api/*` (one rule on Free).
- Bot Fight Mode.
- Error reporting — a 500 in prod is currently invisible.

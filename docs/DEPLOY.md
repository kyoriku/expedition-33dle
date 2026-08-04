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
   no need to hand-compose the URL.) Also:
   - `SENTRY_DSN` — Sentry → project → Settings → Client Keys. Unset or
     blank disables Sentry entirely. A malformed (non-blank) DSN raises
     BadDsn at import and fails the healthcheck — so a passing healthcheck
     is itself proof the DSN parsed.
   - `SENTRY_ENVIRONMENT=production` — the events' environment tag
     (defaults to `development` everywhere else).
   - `BOOM_ENABLED` — normally **unset**; see the Sentry pipeline check
     below.
4. App service → Settings → Networking → **Generate Domain** for a
   `*.up.railway.app` URL to test against before DNS (retired after
   cutover — see §3).
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

(Historical: runs before launch day 2026-08-01 showed 28 wall-clock endpoint
tests red by design — pre-launch, the routers correctly raised
PuzzleNotYetAvailable.)

### Verify on the Railway domain (before DNS)

- `curl https://<app>.up.railway.app/api/health` → `{"status":"ok"}`
- `/api/bosses/today` → 50-boss roster, image fields populated
- Browser: play one mode start to finish; images render
- Direct navigation to `/privacy` renders (SPA fallback)
- `/api/nope` → JSON 404 (not the HTML shell)
- `/docs` → the SPA shell, not Swagger (API docs are closed in prod — see
  Standing rules)

### Sentry pipeline check (`/api/_boom`)

End-to-end proof the error pipeline works, on demand: set `BOOM_ENABLED=1`,
redeploy, `curl -i https://<host>/api/_boom` → 500, confirm the
`RuntimeError: sentry verification boom` event in Sentry (tagged
`environment: production`, request context attached), remove the variable,
redeploy, confirm `/api/_boom` is back to the same JSON 404 as any unknown
`/api/` path.

## 2. DNS: Porkbun → Cloudflare → Railway

> Historical: `LAUNCH_DATE` froze at the DNS cutover on 2026-08-01 — real
> players hold streak state from that day on. It lives in the
> frozen-forever list under Standing rules.

1. Cloudflare → Add site → `expedition33dle.com` (Free plan). Discard any
   auto-imported DNS records. Note the two assigned nameservers.
2. Porkbun → domain → **first confirm DNSSEC is off** (no DS records).
   Delegating nameservers while stale DS records sit at the registrar
   produces SERVFAIL — the domain goes down entirely, not partially. Then
   Nameservers → replace with the Cloudflare pair (WHOIS privacy stays on;
   nothing else at Porkbun matters after delegation).
3. Railway → app service → Settings → Networking → add custom domains
   `expedition33dle.com` **and** `www.expedition33dle.com`. Railway issues
   **two records per domain** — a CNAME target and a TXT ownership
   verification record. Copy all four.
4. Cloudflare → DNS: `CNAME @ → <target>` and `CNAME www → <target>`, both
   **Proxied** (Cloudflare flattens the apex CNAME), **plus both TXT
   verification records** exactly as issued. The TXTs are required: without
   them the domain returns 404 indefinitely while Railway shows the domain
   pending — which reads exactly like a propagation delay and isn't.

   Alternative: Railway's one-click **Cloudflare integration (Domain
   Connect)** writes all four records automatically. Caveats from the real
   run: it writes a fixed 1 hr TTL rather than Auto, and re-running it on a
   domain it already configured prompts to delete and recreate its own
   records — which looks alarming and isn't. The manual path above stays
   the primary one.
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
   `index.html`) → Bypass cache.** A cached document pins an old bundle
   hash. (Implemented as "path does not contain a dot" — the clause the
   known gap below hinges on.)
3. **`/assets/*` → Cache Eligible, Edge TTL 1 year, Browser TTL 1 year.**
   Content-hashed filenames; immutable.
4. **`/portraits/*` OR `/pictos/*` OR `/weapons/*` OR `/bosses/*` OR
   `/fonts/*` → Cache Eligible, Edge TTL 7 days, Browser TTL 1 day.**
   Not content-hashed: **replacing an image requires a Cloudflare purge of
   that URL.**

Browser TTL matters on 3 and 4 because FastAPI's static file responses send
`etag`/`last-modified` but no `Cache-Control: max-age` — without it you get
edge caching and no browser caching.

Known gap: dotted paths at the root — `/openapi.json`, `/robots.txt`,
`/sitemap.xml` and similar — match none of the four rules (rule 2's no-dot
clause excludes them, and they aren't under `/api/`, `/assets/`, or the
image dirs), so they fall through to Cloudflare defaults. No longer just
theoretical: the fallthrough copy can be cached and outlive a deploy — see
the robots.txt row in False signals. After changing any dotted root file
(`robots.txt`, `sitemap.xml`, `ads.txt`), the first step is purging its
exact URL.

### Verify on the prod domain

- `dig NS expedition33dle.com` → Cloudflare nameservers
- `curl -I https://expedition33dle.com` → `cf-ray` header present
- Second fetch of an image URL → `cf-cache-status: HIT`
- `/api/classic/today` → `cf-cache-status: DYNAMIC` or `BYPASS` — both mean
  uncached (see False signals below)
- `http://` and `www.` both 301 to the `https://` apex
- Full game end-to-end on launch day (2026-08-01 UTC = puzzle #1)

After every check above passes: **retire the `*.up.railway.app` generated
domain** (Railway → Settings → Networking → delete). It is duplicate
content for SEO, and it bypasses Cloudflare entirely — no cache, no rate
limiting, no Bot Fight Mode. Keep it until prod is verified: it is the
origin bypass you need if something goes wrong mid-cutover.

## False signals (looks broken, isn't)

During cutover and the day-2 edge work, the authoritative check is always a
curl or dig against a known-good resolver, never a provider dashboard —
Railway's domain status, Cloudflare's cache labels, and the local resolver
all reported states that contradicted what the site was actually serving.
The rows below are the instances that cost real time.

| Symptom | Actual cause | Verify with |
| --- | --- | --- |
| Railway shows "Waiting for DNS update" / "Incorrect DNS setup" indefinitely while both domains serve fine | Railway resolves the hostname expecting its own CNAME target and gets Cloudflare's anycast IPs through the proxy | `curl -sD - -o /dev/null --resolve <host>:443:<cf-ip> https://<host>/api/health` — curl is authoritative, the dashboard label is not |
| Command line gets the registrar's parking page (openresty / an l.ink redirect) while browsers load the site fine | The system resolver keeps serving pre-delegation records long after delegation is live; browsers on DNS-over-HTTPS already see the new ones. Not a misconfiguration | `dig @1.1.1.1 expedition33dle.com` (or `@8.8.8.8`), or force the connection: `curl --resolve` |
| `/api/*` returns `cf-cache-status: DYNAMIC`, not `BYPASS`, with the bypass rule correctly applied and deployed | Both mean uncached — DYNAMIC is simply Cloudflare's label for this configuration | Nothing to fix; confirm repeat fetches never show `HIT` |
| A sequential curl loop against `/api/*` returns all 200s and never trips the rate limit, suggesting the rule isn't working | Each curl is a fresh TLS handshake, so 60 sequential requests take well over the 10-second window — the threshold is never exceeded within one period. The rule is fine | `seq 1 200 \| xargs -P 20 -I{} curl -s -o /dev/null -w '%{http_code}\n' https://<host>/api/health \| sort \| uniq -c` — expect a mix of 200 and 429 (real run: 273 × 200, 27 × 429 out of 300 parallel requests). Tripping it blocks your own IP for 10 s; that is the rule working |
| `/robots.txt` still serves old content after deploying a change — in the real run, Cloudflare's managed block (see Edge protection) followed by raw `index.html`, long after the real file had merged and deployed | The dotted-root cache gap in §3: `/robots.txt` matches none of the four cache rules and falls through to Cloudflare defaults; the composite gets cached, and the cached copy can predate the origin file existing. Not a managed-robots.txt misconfiguration and not a bad deploy | Caching → Configuration → Purge Cache → Custom Purge → the exact URL `https://expedition33dle.com/robots.txt`; re-check after ~30 seconds |
| A newly added or extended WAF rule appears not to fire — the blocked path still returns 200 | A pre-rule 200 response for that exact URL is cached at Cloudflare's edge and served before the WAF evaluates. Most likely on dotted root paths, which match none of the four cache rules and fall through to Cloudflare defaults (the known gap in §3). The rule is fine | Request a path never requested before — `curl -s -o /dev/null -w '%{http_code}\n' https://expedition33dle.com/nonsense-test.sql` — or purge the exact URL and retry |

## Standing rules

**Frozen forever** (any change reshuffles every historical daily answer):
roster names (add/remove/rename in any mode), `SHUFFLE_SEED`, the per-mode
salts, `LAUNCH_DATE`, the scheduling algorithm.

**Also frozen forever**: the localStorage key prefix `expedition33dle:` in
`client/src/lib/storage.ts`. Different mechanism, same finality — the data
lives only in players' browsers under the old keys, so changing the prefix
destroys every player's streaks and stat history with no recovery. Repo,
folder, or domain renames must not touch it.

The seed guard enforces the roster half at deploy time. Its escape path, in
order:
1. **Pin elapsed days' answers first** (a table of date → answer, served for
   past days; the pure function takes over going forward).
2. Edit `EXPECTED_COUNTS` in `server/scripts/seed.py`.
3. Set `ALLOW_SEED_PRUNE=1` on that deploy **only if the change also removes
   entries**. `ALLOW_SEED_PRUNE` does **not** bypass the count check.

The scheduling fingerprint guard
(`server/app/services/scheduling_guard.py`) enforces the rest —
`SHUFFLE_SEED`, the per-mode salts, `LAUNCH_DATE`, the algorithm — at import
time: a mismatch crashes the app before uvicorn binds, so `/api/health`
fails and Railway holds the previous deploy. A deliberate change means
recomputing `EXPECTED_SCHEDULING_FINGERPRINT` in the same commit (the dummy
`DATABASE_URL` is required by imports only; nothing connects):

```
cd server && DATABASE_URL=postgresql+asyncpg://x:x@localhost/x \
  uv run --no-sync python -c "from app.services.scheduling_guard import compute_scheduling_fingerprint as c; print(c())"
```

**Freely editable live**: every attribute value and every image — reseed
(deploy) and, for a replaced image, purge its URL from Cloudflare's cache.

**Additive any time**: logging, rate limiting, security headers.

**API docs are closed in prod** (`docs_url` / `redoc_url` / `openapi_url`
all `None` in `app/main.py`): `/docs`, `/redoc`, and `/openapi.json` serve
the SPA shell like any unknown path. Habit: register any future internal
route with `include_in_schema=False` anyway — belt and braces even with the
schema unserved.

## Edge protection (as configured)

**Rate limiting** (Security → Rate limiting rules — the free plan allows
exactly one rule, and this is the one that gets it):

- Expression: `http.host eq "expedition33dle.com"` (all paths)
- Characteristic: IP
- Threshold: 100 requests / 10 seconds
- Action: Block, duration 10 seconds

Threshold rationale: non-API paths previously had no limit at all — which
is how a 44-request secrets sweep (see the WAF rule below) completed
unimpeded. A cold page load is roughly 12–18 requests and opening all
four modes quickly might reach 40–50, so 100/10s is generous for real
play while catching sequential scanners. The trade is losing the tighter
50/10s specifically on `/api/*`; acceptable because the API serves
read-only public data and the observed threat is broad path sweeping.
Verified live: 300 parallel requests returned 273 200s and 27 429s.

**Bot Fight Mode** (Security → Bots): on. Verified search crawlers are
exempt — but if indexing ever looks wrong, this is the first thing to
check.

**WAF custom rule: block common probe paths** (Security → WAF → Custom
rules — the free plan allows five custom rules; this uses one):

- Expression: `http.request.uri.path contains "/.env" or
  http.request.uri.path contains "/.git" or http.request.uri.path
  contains "/wp-" or http.request.uri.path eq "/xmlrpc.php" or
  http.request.uri.path contains "/vendor/" or http.request.uri.path
  contains "/lander/" or http.request.uri.path contains "/.ssh/" or
  http.request.uri.path contains "/.svn/" or http.request.uri.path
  contains "/.vscode/" or http.request.uri.path contains "/.aws/" or
  http.request.uri.path contains "/.stripe/" or http.request.uri.path
  contains "/actuator/" or ends_with(http.request.uri.path, ".php") or
  ends_with(http.request.uri.path, ".sql") or
  ends_with(http.request.uri.path, ".yml") or
  ends_with(http.request.uri.path, ".yaml") or
  ends_with(http.request.uri.path, ".log") or
  ends_with(http.request.uri.path, ".key") or
  ends_with(http.request.uri.path, ".pem") or
  ends_with(http.request.uri.path, ".bak") or
  ends_with(http.request.uri.path, ".db") or
  ends_with(http.request.uri.path, ".ini") or
  ends_with(http.request.uri.path, ".conf") or
  ends_with(http.request.uri.path, ".zip") or
  ends_with(http.request.uri.path, ".gz")`
- Action: Block

Why it exists: Railway logs showed two scanner families reaching the
origin — a commodity `.env`/`.git` credential sweep (16 filename
variants) and a Russian phishing operation probing for an
already-compromised host to serve bank-scam landers. Every non-`/api/`
probe was answered 200 with the SPA shell — not a leak, but each one
consumes an origin request and fills the logs; blocked at the edge, they
never reach Railway. Unmatched `/api/*` paths already return a JSON 404
(`/api/.env` was the only 404 in the sampled logs) — that behavior needs
no change.

Why it was extended: the original prefix-based expression missed a
~44-path secrets sweep (SSH keys, `.npmrc`, `secrets.json`, database
dumps, `docker-compose.yml`, Spring Actuator heapdump, Laravel logs,
`.vscode/sftp.json`, `.bash_history`) from a single IP running
Go-http-client. The scan included randomized `zzcanary-*` control paths —
those exist to detect hosts that return 200 for everything, so the SPA
soft-404 fallback actually invalidated the scanner's whole result set.
Nothing leaked; the cost was 44 origin requests and log noise. The rule
remains a denylist and will keep missing new patterns — the rate limit
above is the general defense.

**Managed robots.txt** (AI Crawl Control → Settings → "Manage your
robots.txt"): set to **Instruct AI bots to not scrape content**. This does
not replace the origin's robots.txt — Cloudflare prepends its own block
(the Content-Signals framework plus Disallow rules for Amazonbot,
Applebot-Extended, Bytespider, CCBot, ClaudeBot,
CloudflareBrowserRenderingCrawler, Google-Extended, GPTBot,
meta-externalagent) on top of whatever the origin returns, so the served
`/robots.txt` is a composite. Before `client/public/robots.txt` existed,
the origin answered `/robots.txt` with the SPA shell, so the served file
was Cloudflare's block followed by a full HTML document.

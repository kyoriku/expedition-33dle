# OG image source

`og-image.html` is the source of truth for `client/public/og-image.png`
(1200×630, referenced by the `og:image` / `twitter:image` meta tags in
`client/index.html`).

To re-render after editing the HTML (Playwright is a one-off tool here, not a
project dependency):

```bash
cd client/og
npx playwright screenshot --viewport-size=1200,630 og-image.html ../public/og-image.png
```

The image is mode-agnostic (no attribute matrix) so it stays valid for any
future game mode: gold serif title, ghosted "33", and a tapered brush-stroke
mark on the warm-black brand background. Fonts are local — the site's
self-hosted upright variable woff2 (`../public/fonts/`) plus a dev-only
italic variable woff2 in `./fonts/` — so rendering needs no network.

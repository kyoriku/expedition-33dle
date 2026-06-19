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

The image is mode-agnostic (no attribute matrix) so it stays valid for any future
game mode — Belle Époque brand style: Cinzel title, a `✦ Clair Obscur ✦` kicker,
ghosted "33", and an ornate double gold frame on the warm-black background. Fonts
are the site's own self-hosted woff2 in `../public/fonts/` (Cinzel, EB Garamond
italic, Bebas Neue), so rendering needs no network.

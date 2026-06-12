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

The sample matrix row intentionally keeps the in-game feedback colors
(green/yellow/gray) as the "Wordle-like" genre signal; the gold-on-black
title is the E33 brand treatment.

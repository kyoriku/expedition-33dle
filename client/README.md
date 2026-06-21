# Expedition 33dle — client

The React single-page app for [Expedition 33dle](../README.md). See the root
README for the full project overview, backend, and dev-container setup.

## Stack

- **React 19** + **TypeScript**
- **Vite** (dev server + build)
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **React Router** for routing
- **TanStack Query** for server state (fetching today's puzzle, submitting guesses)
- **react-markdown** + **remark-gfm** for the legal pages
- **Vitest** + **Testing Library** for tests

## Running

From the **repo root**, `npm run dev` starts the backend and this client together.
To run only the client:

```bash
npm run dev          # Vite on http://localhost:3001
```

The dev server proxies `/api` to the backend on `:8001` (see `vite.config.ts`), so
the FastAPI server must be running for puzzle data to load.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server on `:3001` (HMR) |
| `npm run build` | Type-check (`tsc -b`) then build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | ESLint |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |

## Structure

```
src/
  main.tsx          Entry: QueryClientProvider + App
  App.tsx           Routes
  pages/            Route components: MenuPage, ClassicPage, PictosPage,
                    PrivacyPage, TermsPage
  components/       UI: Header, GuessGrid/Row, GuessInput, Modal, ShareButton,
                    StatsBlock, Portrait, Countdown, How-To/Legend, etc.
  lib/              Non-UI logic:
                      api.ts        backend calls (today / guess / reveal)
                      storage.ts    localStorage game state + stats
                      stats.ts      streaks, distributions, guess caps
                      share.ts      emoji-grid share text
                      menuStatus.ts per-mode menu status line
                      attributes.ts attribute display config
                      time.ts       UTC day helpers
                      types.ts      shared types
  content/          Markdown for privacy / terms pages
  index.css         Tailwind import, design tokens (@theme), @font-face
public/
  fonts/            self-hosted woff2 (preloaded in index.html)
  portraits/        character art   pictos/ Picto icons
  og-image.png      social card (source: og/og-image.html)
```

## Routes

`/` menu · `/classic` Classic mode · `/pictos` Pictos mode · `/privacy` · `/terms`

## State & persistence

There are no accounts. Per-mode game state (today's guesses and outcome) and
lifetime stats (streaks, guess distribution) live in **localStorage**
(`lib/storage.ts`, `lib/stats.ts`), keyed by the UTC date. The menu reads this
synchronously to show each mode's status — no API call on menu load.

## Styling & fonts

Tailwind v4 is configured through the Vite plugin; design tokens (colors, font
families) are defined as CSS variables in `@theme` in `src/index.css`. Fonts are
self-hosted woff2 in `public/fonts/` and **preloaded** in `index.html` to reduce
the font-swap flash on first paint.

## Production

`npm run build` emits `client/dist`, which the FastAPI backend serves directly
(non-`/api` paths fall back to `index.html`). See the root README's API section.

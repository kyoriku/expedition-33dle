import { Link } from "react-router-dom";
import Header from "../components/Header";
import { usePageTitle } from "../lib/usePageTitle";

// Same gold underline treatment as LegalPage's links.
const linkClass =
  "text-gold decoration-gold/40 hover:text-gold-bright underline underline-offset-2";

export default function NotFoundPage() {
  usePageTitle("Page not found | Expedition 33dle");
  return (
    <main className="flex-1 py-8 md:py-12">
      {/* Header spans the same width as the homepage header. */}
      <div className="mx-auto w-full max-w-xl px-4 md:max-w-3xl md:px-6 lg:max-w-6xl">
        <Header brandAs="div" />
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 text-center">
        <h1 className="text-gold mt-10 mb-3 font-serif text-3xl font-extrabold md:text-4xl">
          Page not found
        </h1>
        {/* Most arrivals are stale share links, not typos — say the page is
            gone rather than implying the visitor mistyped. */}
        <p className="text-parchment my-3 text-sm leading-relaxed md:text-base">
          This page doesn’t exist — the link that brought you here is likely
          outdated.
        </p>
        <div className="ornament my-8" aria-hidden="true">
          ✦
        </div>
        <p className="my-3">
          <Link to="/" className={`${linkClass} text-sm`}>
            ← Back to game
          </Link>
        </p>
        <nav
          aria-label="Game modes"
          className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm"
        >
          <Link to="/classic" className={linkClass}>
            Classic
          </Link>
          <Link to="/pictos" className={linkClass}>
            Pictos
          </Link>
          <Link to="/weapons" className={linkClass}>
            Weapons
          </Link>
          <Link to="/bosses" className={linkClass}>
            Bosses
          </Link>
        </nav>
      </div>
    </main>
  );
}

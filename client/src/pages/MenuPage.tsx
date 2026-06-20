import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { formatMenuStatus, type MenuStatus } from "../lib/menuStatus";
import { CLASSIC_MAX_GUESSES, PICTOS_MAX_GUESSES } from "../lib/stats";
import {
  loadPictosState,
  loadPictosStats,
  loadState,
  loadStats,
} from "../lib/storage";
import { todayUtcISO } from "../lib/time";
import { usePageTitle } from "../lib/usePageTitle";

/** Crossed sword — the combat-flavored Classic (character) mode. Decorative;
 *  the <h2> names the mode for assistive tech. */
function ClassicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
      <polygon points="12 1 13.2 4 13.2 14 10.8 14 10.8 4" />
      <rect x="7.5" y="13.6" width="9" height="1.8" rx="0.4" />
      <rect x="11.2" y="15.4" width="1.6" height="4" />
      <circle cx="12" cy="20.6" r="1.5" />
    </svg>
  );
}

/** Diamond emblem with a four-point star — a Picto medallion. Decorative. */
function PictosIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2.5 L21.5 12 L12 21.5 L2.5 12 Z M12 6 L18 12 L12 18 L6 12 Z"
      />
      <polygon points="12 8 13.1 10.9 16 12 13.1 13.1 12 16 10.9 13.1 8 12 10.9 10.9" />
    </svg>
  );
}

/** A clickable mode card. Keyboard focus parity: the global :focus-visible rule
 *  in index.css paints a gold outline on the <a>; focus-visible:border-gold-bright
 *  also brightens the border to match the hover treatment. The card is a `group`
 *  so the icon brightens together with the border on hover/focus. */
function ModeCard({
  to,
  name,
  desc,
  icon,
  status,
}: {
  to: string;
  name: string;
  desc: string;
  icon: ReactNode;
  status: MenuStatus;
}) {
  return (
    <Link
      to={to}
      className="group bg-panneau border-gold/40 hover:border-gold-bright focus-visible:border-gold-bright flex flex-col gap-2 border p-5 transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <span
          className="text-gold group-hover:text-gold-bright transition-colors"
          aria-hidden="true"
        >
          {icon}
        </span>
        <h2 className="font-display text-gold-bright text-xl font-bold tracking-[0.04em] uppercase md:text-2xl">
          {name}
        </h2>
      </div>
      <p className="font-serif text-muted flex-1 text-sm md:text-base">{desc}</p>
      <p className="font-label text-muted text-xs tracking-widest uppercase">
        {status.text}
      </p>
      <span className="font-label text-gold text-sm tracking-[0.12em] uppercase">
        Play →
      </span>
    </Link>
  );
}

export default function MenuPage() {
  usePageTitle("Expedition33dle");
  // Status is read once from localStorage — no API call on menu load. The menu
  // remounts on navigation, so returning from a game reflects the new state.
  const today = todayUtcISO();
  const classicStatus = formatMenuStatus(loadState(today), loadStats(), CLASSIC_MAX_GUESSES);
  const pictosStatus = formatMenuStatus(
    loadPictosState(today),
    loadPictosStats(),
    PICTOS_MAX_GUESSES,
  );

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col lg:justify-center px-4 py-8 md:max-w-3xl md:px-6 lg:max-w-6xl">
      <Header />
      {/* <main> widens to max-w-6xl at lg (matching the game pages, so the header
          self-constrains to the same 768px offset); keep the menu content at that
          width so it stays aligned with the header. */}
      <div className="mx-auto w-full max-w-xl md:max-w-3xl">
        <p className="font-serif text-muted mt-2 mb-1 text-center text-base italic md:text-lg">
          Choose a daily puzzle.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ModeCard
            to="/classic"
            name="Classic"
            desc="Guess today's Clair Obscur: Expedition 33 character."
            icon={<ClassicIcon />}
            status={classicStatus}
          />
          <ModeCard
            to="/pictos"
            name="Pictos"
            desc="Guess today's Clair Obscur: Expedition 33 Picto."
            icon={<PictosIcon />}
            status={pictosStatus}
          />
        </div>
      </div>
    </main>
  );
}

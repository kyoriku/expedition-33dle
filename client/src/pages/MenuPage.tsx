import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { formatMenuStatus, type MenuStatus } from "../lib/menuStatus";
import {
  BOSSES_MAX_GUESSES,
  CLASSIC_MAX_GUESSES,
  PICTOS_MAX_GUESSES,
  WEAPONS_MAX_GUESSES,
} from "../lib/stats";
import {
  loadBossesState,
  loadBossesStats,
  loadPictosState,
  loadPictosStats,
  loadState,
  loadStats,
  loadWeaponsState,
  loadWeaponsStats,
} from "../lib/storage";
import { todayUtcISO } from "../lib/time";
import { usePageTitle } from "../lib/usePageTitle";

/** Bust silhouette — the character-flavored Classic mode. Decorative; the <h2>
 *  names the mode for assistive tech. */
function ClassicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
      <circle cx="12" cy="8" r="4.2" />
      <path d="M3.5 21 C3.5 16.3 7.3 14 12 14 C16.7 14 20.5 16.3 20.5 21 Z" />
    </svg>
  );
}

/** Upright sword — the armory-flavored Weapons mode (the blade that previously
 *  marked Classic; weapons own it now). Decorative. */
function WeaponsIcon() {
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

/** Skull — the boss-fight motif of the Bosses mode. Cranium + jaw with two teeth
 *  notches, eye sockets and a nose knocked out via fillRule. Decorative; the <h2>
 *  names the mode for assistive tech. */
function BossIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C7.6 2 4 5.4 4 9.6c0 2.6 1.4 4.9 3.5 6.3V19c0 .6.4 1 1 1h1.2v-2h1.1v2h2.4v-2h1.1v2h1.2c.6 0 1-.4 1-1v-3.1c2.1-1.4 3.5-3.7 3.5-6.3C20 5.4 16.4 2 12 2ZM9 8.4a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Zm6 0a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Zm-3 4.1 1 2.2h-2l1-2.2Z"
      />
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
  usePageTitle("Expedition 33dle");
  // Status is read once from localStorage — no API call on menu load. The menu
  // remounts on navigation, so returning from a game reflects the new state.
  const today = todayUtcISO();
  const classicStatus = formatMenuStatus(loadState(today), loadStats(), CLASSIC_MAX_GUESSES);
  const pictosStatus = formatMenuStatus(
    loadPictosState(today),
    loadPictosStats(),
    PICTOS_MAX_GUESSES,
  );
  const weaponsStatus = formatMenuStatus(
    loadWeaponsState(today),
    loadWeaponsStats(),
    WEAPONS_MAX_GUESSES,
  );
  const bossesStatus = formatMenuStatus(
    loadBossesState(today),
    loadBossesStats(),
    BOSSES_MAX_GUESSES,
  );

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col  px-4 py-8 md:py-12 md:max-w-3xl md:px-6 lg:max-w-6xl">
      <Header />
      {/* The header spans the full lg:max-w-6xl frame (same as the game pages);
          menu content stays a narrower centered column beneath it. */}
      <div className="mx-auto w-full max-w-xl md:max-w-3xl">
        <p className="font-serif text-muted mt-2 mb-1 text-center text-base italic md:text-lg">
          Choose a daily puzzle.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ModeCard
            to="/classic"
            name="Classic"
            desc="Guess today's Clair Obscur: Expedition 33 Character."
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
          <ModeCard
            to="/weapons"
            name="Weapons"
            desc="Guess today's Clair Obscur: Expedition 33 Weapon."
            icon={<WeaponsIcon />}
            status={weaponsStatus}
          />
          <ModeCard
            to="/bosses"
            name="Bosses"
            desc="Guess today's Clair Obscur: Expedition 33 Boss."
            icon={<BossIcon />}
            status={bossesStatus}
          />
        </div>
      </div>
    </main>
  );
}

import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface HeaderProps {
  /** Optional right-hand slot — the game page passes its №/streak/? cluster
   *  here; legal pages render a title-only bar. */
  right?: ReactNode;
  /** Render the brand as the page's <h1> (home) or a plain wordmark <div>
   *  (legal pages, where the page title supplies the sole <h1>). */
  brandAs?: "h1" | "div";
}

export default function Header({ right, brandAs = "h1" }: HeaderProps) {
  const Brand = brandAs;
  return (
    <>
      <header className="mb-1.5 flex items-center justify-between gap-2">
        <Brand className="leading-none">
          <Link to="/" className="group block">
            <span className="font-label text-gold/70 block text-[11px] tracking-[0.4em] uppercase md:text-sm">
              ✦ Clair Obscur ✦
            </span>
            <span className="font-display text-parchment group-hover:text-gold-bright mt-0.5 block text-xl font-bold tracking-[0.06em] uppercase transition-colors md:text-3xl lg:text-[2.5rem]">
              Expedition <span className="text-gold">33dle</span>
            </span>
          </Link>
        </Brand>
        {right}
      </header>
      <div className="rule" aria-hidden="true" />
    </>
  );
}

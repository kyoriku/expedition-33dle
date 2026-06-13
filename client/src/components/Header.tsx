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
      <header className="mb-1.5 flex items-baseline justify-between">
        <Brand className="font-serif text-2xl font-extrabold tracking-wide md:text-4xl lg:text-[2.75rem]">
          <Link to="/">
            Expedition <span className="text-gold">33dle</span>
          </Link>
        </Brand>
        {right}
      </header>
      <div className="rule" aria-hidden="true" />
    </>
  );
}

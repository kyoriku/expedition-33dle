import { Link } from "react-router-dom";

// Global footer, rendered on every route.
export default function Footer() {
  return (
    // Width + padding mirror the pages' <main> (and the header inside it), so the
    // top and bottom hairline rules frame the content at exactly the same edges.
    <footer className="mx-auto w-full max-w-xl px-4 pt-8 pb-4 md:max-w-3xl md:px-6 lg:max-w-6xl lg:pt-10">
      <div className="rule" aria-hidden="true" />
      <p className="text-muted mt-2 text-center text-[10px] tracking-[0.15em] uppercase">
        expedition33dle.com · an unofficial fan game
        {/* privacy · terms drop to their own line below sm, inline at sm+ */}
        <span className="block sm:inline">
          <span className="hidden sm:inline"> · </span>
          <Link to="/privacy" className="hover:text-gold">
            privacy
          </Link>
          {" · "}
          <Link to="/terms" className="hover:text-gold">
            terms
          </Link>
        </span>
      </p>
    </footer>
  );
}

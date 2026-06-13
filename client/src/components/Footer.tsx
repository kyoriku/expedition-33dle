import { Link } from "react-router-dom";

// Global footer, rendered on every route.
export default function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[752px] px-2 pt-8 pb-4 md:px-4 lg:pt-10">
      <div className="rule" aria-hidden="true" />
      <p className="text-muted mt-2 text-center text-[10px] tracking-[0.15em] uppercase">
        expedition33dle.com · an unofficial fan game ·{" "}
        <Link to="/privacy" className="hover:text-gold">
          privacy
        </Link>{" "}
        ·{" "}
        <Link to="/terms" className="hover:text-gold">
          terms
        </Link>
      </p>
    </footer>
  );
}

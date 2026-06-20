import { Link } from "react-router-dom";
import Header from "../components/Header";
import { usePageTitle } from "../lib/usePageTitle";

/** A clickable mode card. Keyboard focus parity: the global :focus-visible rule
 *  in index.css paints a gold outline on the <a>; focus-visible:border-gold-bright
 *  also brightens the border to match the hover treatment. */
function ModeCard({ to, name, desc }: { to: string; name: string; desc: string }) {
  return (
    <Link
      to={to}
      className="bg-panneau border-gold/40 hover:border-gold-bright focus-visible:border-gold-bright flex flex-col gap-2 border p-5 transition-colors"
    >
      <h2 className="font-display text-gold-bright text-xl font-bold tracking-[0.04em] uppercase md:text-2xl">
        {name}
      </h2>
      <p className="font-serif text-muted flex-1 text-sm md:text-base">{desc}</p>
      <span className="font-label text-gold text-sm tracking-[0.12em] uppercase">
        Play →
      </span>
    </Link>
  );
}

export default function MenuPage() {
  usePageTitle("Expedition33dle");
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 md:max-w-3xl md:px-6 lg:justify-center">
      <Header />
      <p className="font-serif text-muted mt-2 mb-1 text-center text-base italic md:text-lg">
        Choose a daily puzzle.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ModeCard
          to="/classic"
          name="Classic"
          desc="Guess today's Clair Obscur: Expedition 33 character."
        />
        <ModeCard 
          to="/pictos" 
          name="Pictos" 
          desc="Guess today's Clair Obscur: Expedition 33 Picto." />
      </div>
    </main>
  );
}

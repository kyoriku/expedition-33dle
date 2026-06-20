import Header from "../components/Header";
import { usePageTitle } from "../lib/usePageTitle";

/** Stub for the pictos mode. Real game UI lands in R4c-pictos-game; the
 *  endpoints (/api/pictos/*) and PICTOS_ATTRIBUTES already exist. */
export default function PictosPage() {
  usePageTitle("Daily Picto | Expedition33dle");
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 md:max-w-3xl md:px-6">
      <Header />
      <div className="text-parchment flex flex-1 items-center justify-center px-4 text-center text-base italic">
        Pictos mode — coming soon.
      </div>
    </main>
  );
}

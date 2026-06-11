import type { GuessResponse } from "../lib/types";
import GuessRow from "./GuessRow";

const COLUMNS = ["Name", "Gender", "Age", "Class", "Weapon", "Element", "Act"];

interface GuessGridProps {
  guesses: GuessResponse[];
}

export default function GuessGrid({ guesses }: GuessGridProps) {
  return (
    <section className="mt-4">
      <div className="mb-1 grid grid-cols-7 gap-1">
        {COLUMNS.map((label) => (
          <div
            key={label}
            className="border-b border-zinc-600 pb-1 text-center text-[9px] font-semibold tracking-wide text-zinc-400 uppercase"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {guesses.map((g) => (
          <GuessRow key={g.guess.id} result={g} />
        ))}
      </div>
    </section>
  );
}

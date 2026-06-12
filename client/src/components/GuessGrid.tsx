import type { GuessResponse } from "../lib/types";
import GuessRow from "./GuessRow";

const COLUMNS = ["Name", "Gender", "Age", "Class", "Weapon", "Element", "Act"];

interface GuessGridProps {
  guesses: GuessResponse[];
}

export default function GuessGrid({ guesses }: GuessGridProps) {
  return (
    <section className="my-4">
      <div className="mb-1 grid grid-cols-7 gap-1 md:gap-1.5">
        {COLUMNS.map((label) => (
          <div
            key={label}
            className="border-line text-muted border-b pb-1 text-center text-[9px] font-semibold tracking-wide uppercase md:text-[11px]"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 md:gap-1.5">
        {guesses.map((g) => (
          <GuessRow key={g.guess.id} result={g} />
        ))}
      </div>
    </section>
  );
}

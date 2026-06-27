import { WEAPONS_ATTRIBUTES } from "../lib/attributes";
import type {
  Weapon,
  WeaponGuessFeedback,
  WeaponGuessResponse,
} from "../lib/types";
import GuessRowBase from "./GuessRowBase";

// Weapons' 6-column grid template — a literal string (Tailwind JIT scans literals)
// imported by WeaponsGuessGrid + WeaponsAnswerReveal. Same cell sizes / name-column
// widths as the other modes so the grids line up exactly.
export const WEAPONS_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[200px_repeat(6,92px)] gap-1.5 " +
  "lg:grid-cols-[250px_repeat(6,96px)]";

interface WeaponsGuessRowProps {
  result: WeaponGuessResponse;
  animate?: boolean;
  latest?: boolean;
}

export default function WeaponsGuessRow({
  result,
  animate = false,
  latest = false,
}: WeaponsGuessRowProps) {
  return (
    <GuessRowBase<Weapon, WeaponGuessFeedback>
      result={result}
      attributes={WEAPONS_ATTRIBUTES}
      gridTemplate={WEAPONS_GRID_TEMPLATE}
      dir="weapons"
      animate={animate}
      latest={latest}
    />
  );
}

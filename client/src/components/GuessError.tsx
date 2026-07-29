import { ApiError } from "../lib/api";

interface GuessErrorProps {
  error: unknown; // the mutation's failure — an ApiError carries server copy
}

/** Failure banner for a rejected guess POST, shared by every mode. A server
 *  detail (4xx/5xx the player can act on, e.g. "Puzzle not yet completed") wins
 *  over the generic offline copy.
 *
 *  Width is pinned to the combobox above it rather than inherited from the page
 *  container, which runs to max-w-6xl on desktop and would otherwise stretch a
 *  one-line message across the full grid. Colors are the grid's own miss tile
 *  (square, gradient, gold-adjacent palette) so a failure reads as part of the
 *  game rather than a browser dialog. */
export default function GuessError({ error }: GuessErrorProps) {
  return (
    <p
      role="alert"
      className="bg-linear-to-b from-miss to-miss/80 border-miss-edge text-parchment font-serif mx-auto mt-3 w-full max-w-md border px-3 py-2 text-center text-sm md:text-base"
    >
      {error instanceof ApiError
        ? error.message
        : "Guess failed — check your connection and try again"}
    </p>
  );
}

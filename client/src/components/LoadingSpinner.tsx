/** Gold ring spinner for the pre-data page state. Matches GuessInput's
 *  in-flight spinner idiom; the visually hidden copy keeps the loading
 *  announcement for assistive tech. */
export default function LoadingSpinner() {
  return (
    <span role="status" className="flex items-center justify-center">
      <span
        aria-hidden="true"
        className="border-muted border-t-gold h-8 w-8 animate-spin rounded-full border-2"
      />
      <span className="sr-only">Loading today’s puzzle…</span>
    </span>
  );
}

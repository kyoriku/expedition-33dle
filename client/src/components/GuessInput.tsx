import { useState } from "react";

/** Strip accents and lowercase, so "sirene" matches "Sirène". */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const LISTBOX_ID = "guess-suggestions";
const optionId = (i: number) => `guess-option-${i}`;

/** The minimal shape GuessInput needs from a guessable item. Both Character and
 *  Picto satisfy it, so the same combobox serves both modes. */
interface NamedItem {
  id: number;
  name: string;
}

interface GuessInputProps<T extends NamedItem> {
  items: T[]; // pre-sorted by name from /api/<mode>/today
  guessedIds: Set<number>; // excluded from suggestions
  disabled: boolean; // true while POST in flight
  onSubmit: (item: T) => void;
  noun?: string; // singular item noun for copy, e.g. "character" | "Picto"
}

export default function GuessInput<T extends NamedItem>({
  items,
  guessedIds,
  disabled,
  onSubmit,
  noun = "character",
}: GuessInputProps<T>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim();
  const suggestions = trimmed
    ? items.filter(
        (item) => !guessedIds.has(item.id) && norm(item.name).includes(norm(query)),
      )
    : [];
  const showList = open && suggestions.length > 0;
  const showEmpty = open && trimmed !== "" && suggestions.length === 0;

  function submit(item: T) {
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    onSubmit(item);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = suggestions[activeIndex] ?? suggestions[0];
      if (pick) submit(pick);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    // z-30 lifts the whole input (and its dropdown) into a stacking context
    // above the guess grid, whose relative/animated cells otherwise paint over
    // an absolutely-positioned dropdown that opens down across them.
    <div className="relative z-30 mx-auto w-full max-w-md">
      <div className="border-gold/40 bg-panneau focus-within:border-gold flex items-center gap-2 border px-3 py-2.5 transition-colors focus-within:shadow-[0_0_25px_rgba(217,169,63,0.10)]">
        <span aria-hidden="true" className="text-gold/70 select-none">
          ✦
        </span>
        <input
          type="text"
          value={query}
          disabled={disabled}
          placeholder={`Type a ${noun}'s name…`}
          autoComplete="off"
          enterKeyHint="go"
          role="combobox"
          aria-expanded={showList}
          aria-controls={LISTBOX_ID}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          aria-busy={disabled}
          aria-label={`Guess a ${noun}`}
          className="font-serif text-parchment placeholder-muted w-full bg-transparent text-base outline-none disabled:opacity-50"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setOpen(false)}
        />
        {disabled && (
          <span
            aria-hidden="true"
            className="border-muted border-t-gold h-4 w-4 shrink-0 animate-spin rounded-full border-2"
          />
        )}
      </div>
      {showList && (
        <ul
          id={LISTBOX_ID}
          role="listbox"
          aria-label={`${noun[0].toUpperCase()}${noun.slice(1)} suggestions`}
          className="border-gold/40 bg-panneau absolute z-10 mt-1 max-h-60 w-full overflow-y-auto border shadow-lg"
        >
          {suggestions.map((item, i) => (
            <li
              key={item.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              className={`font-serif text-parchment cursor-pointer px-3 py-2 text-base ${
                i === activeIndex ? "bg-raised" : "hover:bg-raised"
              }`}
              // mousedown fires before the input's blur, so selection wins
              onMouseDown={(e) => {
                e.preventDefault();
                submit(item);
              }}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
      {showEmpty && (
        <div
          role="status"
          className="border-gold/40 bg-panneau text-muted font-serif absolute z-10 mt-1 w-full border px-3 py-2 text-sm italic shadow-lg"
        >
          No {noun}s match “{trimmed}”
        </div>
      )}
    </div>
  );
}

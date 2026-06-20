import { useState } from "react";
import type { Entity } from "../lib/types";

/** Strip accents and lowercase, so "sirene" matches "Sirène". */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const LISTBOX_ID = "guess-suggestions";
const optionId = (i: number) => `guess-option-${i}`;

interface GuessInputProps {
  entities: Entity[]; // pre-sorted by name from /api/classic/today
  guessedIds: Set<number>; // excluded from suggestions
  disabled: boolean; // true while POST in flight
  onSubmit: (entity: Entity) => void;
}

export default function GuessInput({
  entities,
  guessedIds,
  disabled,
  onSubmit,
}: GuessInputProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim();
  const suggestions = trimmed
    ? entities.filter(
        (e) => !guessedIds.has(e.id) && norm(e.name).includes(norm(query)),
      )
    : [];
  const showList = open && suggestions.length > 0;
  const showEmpty = open && trimmed !== "" && suggestions.length === 0;

  function submit(entity: Entity) {
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    onSubmit(entity);
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
          placeholder="Type a character's name…"
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
          aria-label="Guess a character"
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
          aria-label="Character suggestions"
          className="border-gold/40 bg-panneau absolute z-10 mt-1 max-h-60 w-full overflow-y-auto border shadow-lg"
        >
          {suggestions.map((entity, i) => (
            <li
              key={entity.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              className={`font-serif text-parchment cursor-pointer px-3 py-2 text-base ${
                i === activeIndex ? "bg-raised" : "hover:bg-raised"
              }`}
              // mousedown fires before the input's blur, so selection wins
              onMouseDown={(e) => {
                e.preventDefault();
                submit(entity);
              }}
            >
              {entity.name}
            </li>
          ))}
        </ul>
      )}
      {showEmpty && (
        <div
          role="status"
          className="border-gold/40 bg-panneau text-muted font-serif absolute z-10 mt-1 w-full border px-3 py-2 text-sm italic shadow-lg"
        >
          No characters match “{trimmed}”
        </div>
      )}
    </div>
  );
}

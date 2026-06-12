import { useState } from "react";
import type { Entity } from "../lib/types";

/** Strip accents and lowercase, so "sirene" matches "Sirène". */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

interface GuessInputProps {
  entities: Entity[]; // pre-sorted by name from /api/today
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

  const suggestions = query.trim()
    ? entities.filter(
        (e) => !guessedIds.has(e.id) && norm(e.name).includes(norm(query)),
      )
    : [];

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
      setActiveIndex(
        (i) => (i - 1 + suggestions.length) % suggestions.length,
      );
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
    <div className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder="Type a character name…"
        autoComplete="off"
        enterKeyHint="go"
        className="border-line bg-raised text-parchment placeholder-muted focus:border-gold w-full rounded-md border px-3 py-2 text-sm focus:outline-none disabled:opacity-50 md:py-2.5 md:text-base"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
      />
      {open && suggestions.length > 0 && (
        <ul className="border-line bg-raised absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border shadow-lg">
          {suggestions.map((entity, i) => (
            <li key={entity.id}>
              <button
                type="button"
                className={`text-parchment w-full px-3 py-2 text-left text-sm ${
                  i === activeIndex ? "bg-surface" : "hover:bg-surface"
                }`}
                // mousedown fires before the input's blur, so selection wins
                onMouseDown={(e) => {
                  e.preventDefault();
                  submit(entity);
                }}
              >
                {entity.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
        className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none disabled:opacity-50"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-zinc-600 bg-zinc-800 shadow-lg">
          {suggestions.map((entity, i) => (
            <li key={entity.id}>
              <button
                type="button"
                className={`w-full px-3 py-2 text-left text-sm text-zinc-100 ${
                  i === activeIndex ? "bg-zinc-700" : "hover:bg-zinc-700"
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

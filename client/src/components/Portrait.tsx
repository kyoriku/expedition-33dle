import { useState } from "react";

interface PortraitProps {
  name: string;
  image: string | null;
  /** Size/shape classes, e.g. "h-10 w-10". */
  className?: string;
}

/** First letter of the name, for the fallback monogram. */
function monogram(name: string): string {
  const ch = name.trim()[0] ?? "?";
  return ch.toUpperCase();
}

/**
 * Square portrait window. Renders the entity's image from /portraits when set
 * and loadable; otherwise a Cinzel gold monogram. Decorative (aria-hidden) — the
 * guess row's rowheader already names the entity to assistive tech.
 */
export default function Portrait({ name, image, className = "" }: PortraitProps) {
  const [failed, setFailed] = useState(false);
  const showImage = image && !failed;

  return (
    <span
      aria-hidden="true"
      className={`bg-ink border-gold/25 flex shrink-0 items-center justify-center overflow-hidden border ${className}`}
    >
      {showImage ? (
        <img
          src={`/portraits/${image}`}
          alt=""
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-display text-gold text-lg leading-none font-bold md:text-xl">
          {monogram(name)}
        </span>
      )}
    </span>
  );
}

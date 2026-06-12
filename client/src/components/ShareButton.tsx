import { useEffect, useRef, useState } from "react";

interface ShareButtonProps {
  text: string;
}

export default function ShareButton({ text }: ShareButtonProps) {
  const [label, setLabel] = useState("Share");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function handleClick() {
    navigator.clipboard
      .writeText(text)
      .then(() => setLabel("Copied!"))
      .catch(() => setLabel("Copy failed"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLabel("Share"), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-gold text-glyph hover:bg-gold-bright active:bg-gold-bright mt-3 w-full rounded-md py-2 text-sm font-bold"
    >
      {label}
    </button>
  );
}

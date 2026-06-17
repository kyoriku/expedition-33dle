import { useEffect, useRef, useState } from "react";
import { shareResult } from "../lib/share";
import Toast from "./Toast";

interface ShareButtonProps {
  text: string;
}

export default function ShareButton({ text }: ShareButtonProps) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function showToast(message: string) {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2000);
  }

  async function handleClick() {
    const result = await shareResult(text);
    if (result === "copied") {
      showToast("Copied to clipboard");
    } else if (result === "failed") {
      showToast("Couldn't share — try again?");
    }
    // "shared" and "cancelled" need no toast
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="bg-gold text-glyph hover:bg-gold-bright active:bg-gold-bright mt-3 w-full rounded-md py-2 text-sm font-bold"
      >
        Share
      </button>
      {toast !== null && <Toast message={toast} />}
    </>
  );
}

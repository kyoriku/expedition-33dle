import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Desktop max-width (sm+). Wide by default for the how-to example grid;
   *  narrower for content like stats. */
  widthClass?: string;
}

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function Modal({
  open,
  onClose,
  title,
  children,
  widthClass = "sm:max-w-4xl",
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const trigger = document.activeElement as HTMLElement | null;
    cardRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      // Trap focus: cycle Tab/Shift+Tab within the dialog
      const focusables = Array.from(
        cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === cardRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      trigger?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(); // backdrop click only
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`bg-surface border-gold/30 relative flex max-h-full w-full flex-col border p-5 outline-none ${widthClass}`}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="text-muted hover:text-parchment absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-md"
        >
          ✕
        </button>
        <h2
          id="modal-title"
          className="font-display mb-1.5 shrink-0 text-xl tracking-[0.06em] uppercase"
        >
          {title}
        </h2>
        <div className="rule mb-3 shrink-0" aria-hidden="true" />
        {/* Only the body scrolls; the title + close button above stay pinned. */}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

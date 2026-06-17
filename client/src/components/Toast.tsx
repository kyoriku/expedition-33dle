interface ToastProps {
  message: string;
}

export default function Toast({ message }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-parchment text-glyph border-line font-serif fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border px-4 py-2 text-sm font-semibold shadow-lg"
    >
      {message}
    </div>
  );
}

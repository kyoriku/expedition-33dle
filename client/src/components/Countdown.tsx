import { useEffect, useState } from "react";
import { formatHMS, msToNextUtcMidnight } from "../lib/time";

/** Live HH:MM:SS until the next daily puzzle (00:00 UTC). Display only — the
 *  actual refetch/reset at rollover is driven by useDailyRollover in HomePage. */
export default function Countdown() {
  const [ms, setMs] = useState(msToNextUtcMidnight);

  useEffect(() => {
    const id = setInterval(() => setMs(msToNextUtcMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="font-label text-muted mt-3 text-center text-sm tracking-[0.12em] uppercase md:text-base">
      Next puzzle in{" "}
      <span className="text-gold tabular-nums">{formatHMS(ms)}</span>
    </p>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

function diff(toIso) {
  const end = new Date(toIso).getTime();
  const now = Date.now();
  const ms = Math.max(0, end - now);
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return { ms, days, hours, minutes, seconds };
}

export default function Countdown({ to }) {
  const [d, setD] = useState(() => diff(to));

  useEffect(() => {
    const id = setInterval(() => setD(diff(to)), 1000);
    return () => clearInterval(id);
  }, [to]);

  if (d.ms <= 0) return <span>Locking now…</span>;

  return (
    <span>
      Closes in {d.days}d {d.hours}h {d.minutes}m {d.seconds}s
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";

type ClockState = {
  time: string;
  date: string;
  timezone: string;
};

function readClock(): ClockState {
  const now = new Date();
  return {
    time: new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(now),
    date: new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(now),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function ClientClock() {
  const [clock, setClock] = useState<ClockState | null>(null);

  useEffect(() => {
    setClock(readClock());
    const timer = window.setInterval(() => setClock(readClock()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="clock-strip" aria-live="polite">
      <span>{clock?.time ?? "--:--"}</span>
      <small>
        {clock?.date ?? "Syncing clock"} · {clock?.timezone ?? "local timezone"}
      </small>
    </div>
  );
}


'use client';
import { useEffect, useState } from 'react';
import { fmtET } from '@/lib/time';

export default function MyWeekHeader({ weekNumber, submitOpenAt, freezeAt, nextKickoff }: {
  weekNumber: number;
  submitOpenAt: string | null;
  freezeAt: string | null;
  nextKickoff: string | null;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const countdown = (() => {
    if (!nextKickoff) return 'All games complete';
    const target = new Date(nextKickoff).getTime();
    const diff = Math.max(0, target - now);
    const s = Math.floor(diff / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  })();

  return (
    <div className="header">
      <div className="container">
        <div className="title">SHEET MEAT | WEEK {weekNumber}</div>
        <div className="countdown">{countdown}</div>
        <div className="subinfo">
          {submitOpenAt ? <span>Submissions open: {fmtET(submitOpenAt)}</span> : null}
          {freezeAt ? <span>Lines frozen: {fmtET(freezeAt)}</span> : null}
        </div>
      </div>
    </div>
  );
}

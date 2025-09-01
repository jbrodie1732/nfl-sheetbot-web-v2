
'use client';
import { useEffect, useState } from 'react';
import { fmtET } from '@/lib/time';

type PickType = 'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER';

export default function MyWeekHeader({
  weekNumber,
  freezeAt,
  nextKickoffISO,
  summaryByType
}: {
  weekNumber: number;
  freezeAt: string | null | undefined;
  nextKickoffISO: string | null | undefined;
  summaryByType: Record<string, string>;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const countdown = (() => {
    if (!nextKickoffISO) return 'All games complete';
    const target = new Date(nextKickoffISO).getTime();
    const diff = Math.max(0, target - now);
    const s = Math.floor(diff / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  })();

  const order: Array<[PickType,string]> = [
    ['ATS_FAV','FAV'],
    ['ATS_DOG','DOG'],
    ['TOTAL_OVER','OVER'],
    ['TOTAL_UNDER','UNDER'],
  ];

  return (
    <div className="sticky-header">
      <div className="container">
        <div className="card header-card">
          <div className="h1">SHEET MEAT | WEEK {weekNumber}</div>
          <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:8}}>
            <div className="countdown-wrap"><div className="countdown">{countdown}</div></div>
          </div>
          <div className="small center" style={{marginTop:8}}>
            {freezeAt ? <div>Lines frozen: {fmtET(freezeAt)}</div> : null}
          </div>

          <div className="chip-row">
            {order.map(([key,label]) => {
              const s = summaryByType[key];
              const on = Boolean(s);
              const text = on ? `${label}: ${s} ✓` : label;
              return <span key={key} className={`chip ${on?'chip-on':''}`}>{text}</span>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

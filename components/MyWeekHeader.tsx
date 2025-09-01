
// components/MyWeekHeader.tsx
'use client';
import { useEffect, useState } from 'react';
import { fmtET } from '@/lib/time';
import HeaderMenu from '@/components/HeaderMenu';

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

  function fmtCountdown() {
    if (!nextKickoffISO) return 'All games complete';
    const target = new Date(nextKickoffISO).getTime();
    const diff = Math.max(0, target - now);
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000).toLocaleString('en-US', {minimumIntegerDigits: 2});
    const m = Math.floor((diff % 3_600_000) / 60_000).toLocaleString('en-US', {minimumIntegerDigits: 2});
    const s = Math.floor((diff % 60_000) / 1000).toLocaleString('en-US', {minimumIntegerDigits: 2});
    return `Week ${weekNumber} Kickoff: ${d}d ${h}:${m}:${s}`;
  }

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
          <div className="hdr-grid">
            <div className="left" />
            <div className="center">
              <div className="h1">SHEET MEAT | WEEK {weekNumber}</div>
            </div>
            <div className="right">
              <HeaderMenu />
            </div>
          </div>

          <div className="kickoff-wrap">
            <div className="kickoff-chip">
              {fmtCountdown()}
            </div>
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

      <style jsx>{`
        .hdr-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
        }
        .center { display: flex; justify-content: center; }
        .right { display: flex; justify-content: flex-end; }

        .kickoff-wrap { display:flex; justify-content:center; margin-top: 8px; }
        .kickoff-chip {
          border: 1px solid #e5e7eb;
          border-radius: 9999px;
          padding: 6px 12px;
          font-variant-numeric: tabular-nums;
          background: #ffffff;
          color: #111827;
          box-shadow: 0 1px 0 rgba(17,24,39,0,0.03);
          font-weight: 700;
          font-size: 14px;
        }

        .chip-row { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-top:8px; }
        /* Transparent chips, white text */
        .chip {
          border:1px solid #e5e7eb; border-radius:9999px; padding:4px 10px;
          background:transparent; color:#ffffff; font-size:13px; font-weight:300;
        }
        .chip-on { background:transparent; border-color:#10b981; color:#ffffff; }

        /* Mobile tweaks */
        @media (max-width: 480px){
          .kickoff-chip{ font-size:12px; padding:5px 10px; }
          .chip{ font-size:12px; padding:3px 8px; }
          .h1{ font-size:18px; }
        }
      `}</style>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { fmtET } from '@/lib/time';

type PickType = 'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER';

export default function MyWeekHeader({
  weekNumber,
  submitOpenAt,
  freezeAt,
  nextKickoffISO,
  summaryByType
}: {
  weekNumber: number;
  submitOpenAt: string | null | undefined;
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

  const chips: Array<[PickType,string]> = [
    ['ATS_FAV', 'FAV'],
    ['ATS_DOG', 'DOG'],
    ['TOTAL_OVER', 'OVER'],
    ['TOTAL_UNDER', 'UNDER'],
  ];

  return (
    <div className="sticky-header">
      <div className="container">
        <div className="card header-card">
          <div className="row" style={{justifyContent:'space-between'}}>
            <div>
              <div className="h1">SHEET MEAT | WEEK {weekNumber}</div>
              <div className="small">
                {submitOpenAt ? <span>Submissions open: {fmtET(submitOpenAt)}</span> : null}
                {submitOpenAt && freezeAt ? <span> &nbsp;•&nbsp; </span> : null}
                {freezeAt ? <span>Lines frozen: {fmtET(freezeAt)}</span> : null}
              </div>
            </div>
            <div className="countdown-wrap"><div className="countdown">{countdown}</div></div>
          </div>

          <div className="chip-row">
            {chips.map(([key,label]) => {
              const s = summaryByType[key];
              const on = Boolean(s);
              return (
                <span key={key} className={`chip ${on ? 'chip-on':''}`}>
                  {s ? s : label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
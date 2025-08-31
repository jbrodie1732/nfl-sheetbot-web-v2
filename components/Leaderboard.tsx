
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Row = { nickname: string|null; wins: number; pushes: number; losses: number; points: number; };

export default function Leaderboard({ leagueId, weekNumber }: { leagueId: string|null, weekNumber: number }){
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('vw_leaderboard_week').select('*').eq('week_number', weekNumber);
      if (!error) setRows((data as Row[]) ?? []);
    })();
  }, [weekNumber]);

  if (!rows.length) return null;
  return (
    <div>
      <h3 className="section-title">Leaderboard (Week {weekNumber})</h3>
      <div className="card">
        {rows.map((r,i)=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto', gap:8, padding:'6px 0', borderBottom: i<rows.length-1?'1px solid #1b2230':'none'}}>
            <div><strong>{r.nickname ?? 'Anon'}</strong></div>
            <div className="small">W: {r.wins}</div>
            <div className="small">P: {r.pushes}</div>
            <div className="small">L: {r.losses}</div>
            <div><strong>{r.points.toFixed(1)}</strong></div>
          </div>
        ))}
      </div>
    </div>
  );
}


// components/LeaderboardTable.tsx (responsive mobile-first)
'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  user_id: string
  nickname: string
  week_number?: number | null
  wins: number
  pushes: number
  losses: number
  points: number
}

export default function LeaderboardTable({ mode, weekNumber }: { mode: 'season'|'week', weekNumber?: number }){
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)
  const [sortKey, setSortKey] = useState<'points'|'wins'|'pushes'|'losses'|'nickname'>('points')
  const [sortDir, setSortDir] = useState<'desc'|'asc'>('desc')
  const [myId, setMyId] = useState<string|null>(null)

  useEffect(()=>{
    supabase.auth.getUser().then(({ data })=> setMyId(data.user?.id ?? null))
  }, [])

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true); setError(null)
      const view = mode === 'season' ? 'vw_leaderboard_season' : 'vw_leaderboard_week'
      const query = supabase.from(view).select('*')
      if (mode === 'week' && weekNumber != null) query.eq('week_number', weekNumber)
      const { data, error } = await query
      if (!mounted) return
      if (error) setError(error.message)
      setRows((data || []) as Row[])
      setLoading(false)
    }
    load()
    const timer = setInterval(load, 120000)
    const bump = () => load()
    window.addEventListener('sheetmeat:profile-updated', bump)
    return ()=>{ mounted=false; clearInterval(timer); window.removeEventListener('sheetmeat:profile-updated', bump) }
  }, [mode, weekNumber])

  const sorted = useMemo(()=>{
    const arr = [...rows]
    arr.sort((a,b)=>{
      const va = (a as any)[sortKey] ?? 0, vb = (b as any)[sortKey] ?? 0
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [rows, sortKey, sortDir])

  function onSort(key: typeof sortKey){
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key==='nickname'?'asc':'desc') }
  }

  if (loading) return <div>Loading leaderboard…</div>
  if (error) return <div className="error">Failed to load: {error}</div>
  if (sorted.length === 0) return <div>No data yet.</div>

  return (
    <div className="lb">
      <div className="table-wrap">
        <table>
          <colgroup>
            <col className="c-rank" />
            <col className="c-name" />
            {mode==='week' && <col className="c-week" />}
            <col className="c-num" /><col className="c-num" /><col className="c-num" /><col className="c-num" />
          </colgroup>
          <thead>
            <tr>
              <th className="rank">#</th>
              <th className="name" onClick={()=>onSort('nickname')}>Player</th>
              {mode==='week' && <th className="week">Week</th>}
              <th className="num" onClick={()=>onSort('wins')}>W</th>
              <th className="num" onClick={()=>onSort('pushes')}>P</th>
              <th className="num" onClick={()=>onSort('losses')}>L</th>
              <th className="num" onClick={()=>onSort('points')}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i)=> {
              const isMe = myId && r.user_id === myId
              return (
                <tr key={r.user_id + (r.week_number ?? '')}>
                  <td className="rank num">{i+1}</td>
                  <td className="name">
                    <span className="name-text" title={r.nickname}>{r.nickname}</span>
                    {isMe && <span className="you">You</span>}
                  </td>
                  {mode==='week' && <td className="week num">{r.week_number}</td>}
                  <td className="num">{r.wins}</td>
                  <td className="num">{r.pushes}</td>
                  <td className="num">{r.losses}</td>
                  <td className="num">{r.points.toFixed(1)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .lb { width: 100%; }
        .table-wrap{ width: 100%; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; overflow: hidden; text-overflow: ellipsis; }
        th { text-align: left; font-weight: 600; color: #374151; cursor: pointer; }
        td.name { white-space: nowrap; }
        .name-text { display:inline-block; max-width: 100%; vertical-align: bottom; overflow: hidden; text-overflow: ellipsis; }
        tr:hover td { background: #fafafa; }
        .you {
          margin-left: 8px;
          font-size: 11px;
          border-radius: 9999px;
          padding: 2px 6px;
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }
        .num { text-align: right; white-space: nowrap; }
        .rank { width: 44px; }
        .c-rank { width: 44px; }
        .c-name { width: auto; }
        .c-num { width: 56px; }
        .c-week { width: 64px; }

        /* Mobile: tighter fonts, hide Week column, tighten padding */
        @media (max-width: 480px){
          th, td { padding: 8px 8px; font-size: 12px; }
          .you { font-size: 10px; padding: 2px 5px; }
          .c-week, .week { display: none; } /* hide Week column */
          .c-num { width: 48px; }
          .rank { width: 36px; }
        }
      `}</style>
    </div>
  )
}

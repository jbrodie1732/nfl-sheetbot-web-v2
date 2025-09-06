// components/PublicPicks.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  user_id: string
  nickname: string
  pick_type: 'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER'
  label: string
  created_at: string
}

export default function PublicPicks({ gameId, locked }: { gameId: number, locked: boolean }){
  const [rows, setRows] = useState<Row[]|null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  useEffect(()=>{
    if (!locked) return
    let mounted = true
    async function load(){
      setLoading(true); setError(null)
      const { data, error } = await supabase.rpc('get_public_picks_for_game_v2', { p_game_id: gameId })
      if (!mounted) return
      if (error) setError(error.message)
      setRows(data || [])
      setLoading(false)
    }
    load()
    const timer = setInterval(load, 120_000) // poll every 2 minutes
    return ()=>{ mounted=false; clearInterval(timer) }
  }, [gameId, locked])

  if (!locked) return null
  if (loading && !rows) return <div className="muted">Loading public picks…</div>
  if (error) return <div className="error">Failed to load public picks: {error}</div>
  if (!rows || rows.length === 0) return <div className="muted">No picks revealed yet.</div>

  return (
    <div className="public-picks">
      <div className="subtle">Revealed picks for this game</div>
      <ul className="list">
        {rows.map((r)=> (
          <li key={r.user_id + r.created_at}>
            <span className="name">{r.nickname}</span>
            <span className="pill">{r.label}</span>
          </li>
        ))}
      </ul>
      <style jsx>{`
        .public-picks { margin-top: 8px; }
        .subtle { color: #6b7280; font-size: 12px; margin-bottom: 6px; }
        .list { display: grid; gap: 6px; }
        .name { font-weight: 500; margin-right: 6px; }
        .pill { border: 1px solid #e5e7eb; border-radius: 9999px; padding: 2px 8px; font-size:12px; }
        .muted { color: #9ca3af; }
        .error { color: #b91c1c; }
      `}</style>
    </div>
  )
}

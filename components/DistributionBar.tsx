// components/DistributionBar.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Dist = { ats_fav: number; ats_dog: number; total_over: number; total_under: number; total: number }

export default function DistributionBar({ gameId, kind }:{ gameId:number, kind:'ATS'|'TOTAL' }){
  const [dist, setDist] = useState<Dist|null>(null)
  const [err, setErr] = useState<string|null>(null)

  async function load(){
    const { data, error } = await supabase.rpc('get_public_pick_distribution', { p_game_id: gameId })
    if (error) { setErr(error.message); return }
    setDist(data?.[0] || { ats_fav:0, ats_dog:0, total_over:0, total_under:0, total:0 })
  }

  useEffect(()=>{
    load()
    const id = setInterval(load, 120_000) // poll every 2 minutes
    return ()=> clearInterval(id)
  }, [gameId])

  if (err) return <div className="muted">–</div>
  if (!dist || dist.total === 0) return <div className="muted">No public picks yet.</div>

  const a = Math.max(0, dist.ats_fav)
  const b = Math.max(0, dist.ats_dog)
  const o = Math.max(0, dist.total_over)
  const u = Math.max(0, dist.total_under)

  let left = 0, right = 0, leftLabel = '', rightLabel = ''
  if (kind === 'ATS'){
    const sum = a + b; if (sum === 0) return <div className="muted">No ATS picks yet.</div>
    left = Math.round((a / sum) * 100); right = 100 - left
    leftLabel = `FAV ${left}%`; rightLabel = `DOG ${right}%`
  } else {
    const sum = o + u; if (sum === 0) return <div className="muted">No TOTAL picks yet.</div>
    left = Math.round((o / sum) * 100); right = 100 - left
    leftLabel = `OVER ${left}%`; rightLabel = `UNDER ${right}%`
  }

  return (
    <div className="dist-wrap">
      <div className="dist-bar">
        <div className="left" style={{width: left + '%'}} />
        <div className="right" style={{width: right + '%'}} />
      </div>
      <div className="labels">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <style jsx>{`
        .dist-wrap { margin-top: 6px; }
        .dist-bar { display:flex; height: 8px; border-radius: 9999px; overflow: hidden; border: 1px solid #e5e7eb; }
        .left { flex: 0 0 auto; background: #e0f2fe; } /* light blue */
        .right { flex: 0 0 auto; background: #fee2e2; } /* light red */
        .labels { display:flex; justify-content: space-between; font-size: 12px; color:#6b7280; margin-top: 4px; }
        .muted { color:#9ca3af; font-size:12px; }
      `}</style>
    </div>
  )
}

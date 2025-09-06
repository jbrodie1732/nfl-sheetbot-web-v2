// app/leaderboard/page.tsx — Season first + expandable sections (native <details>)
import Link from 'next/link'
import LeaderboardTable from '@/components/LeaderboardTable'
import EditNicknamePopover from '@/components/EditNicknamePopover'
import { createClient } from '@supabase/supabase-js'
import React from 'react'

export const dynamic = 'force-dynamic'

async function getCurrentWeek(){
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  const sb = createClient(url, key)
  const { data } = await sb.rpc('get_current_week')
  return data || { number: undefined }
}

export default async function Page(){
  const wk = await getCurrentWeek()
  const weekNumber = wk?.number

  const styles: Record<string, React.CSSProperties> = {
    page:   { padding:'16px 20px', maxWidth:1000, margin:'0 auto' },
    header: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 },
    title:  { fontSize:28, fontWeight:800, margin:'0 0 8px' },
    actions:{ display:'flex', alignItems:'center', gap:10 },
    returnTile: {
      display:'inline-flex', alignItems:'center', gap:8,
      padding:'6px 10px', borderRadius:12, border:'1px solid #d1d5db',
      background:'#111827', color:'#ffffff', fontSize:13, fontWeight:700,
      textDecoration:'none', boxShadow:'0 1px 0 rgba(17,24,39,0.03)', whiteSpace:'nowrap'
    },
    sub: { color:'#6b7280', marginBottom:16 },
    details: { marginBottom: 18, border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden', background:'#0b1220' },
    summary: {
      cursor:'pointer', listStyle:'none', padding:'10px 12px', fontWeight:700,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      background:'#0f172a', color:'#e2e8f0'
    },
    sectionBody: { padding:'12px' }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Leaderboard</h1>
        <div style={styles.actions}>
          <EditNicknamePopover />
          <Link href="/" style={styles.returnTile} aria-label="Return to home">
            ⬅️ Home
          </Link>
        </div>
      </div>

      <p style={styles.sub}>Compare weekly performance or season totals.</p>

      {/* SEASON FIRST */}
      <details open style={styles.details}>
        <summary style={styles.summary}>
          <span>Season Standings</span>
          <span aria-hidden>▾</span>
        </summary>
        <div style={styles.sectionBody}>
          <LeaderboardTable mode="season" />
        </div>
      </details>

      {/* THIS WEEK SECOND */}
      <details style={styles.details}>
        <summary style={styles.summary}>
          <span>This Week {weekNumber ? `(Week ${weekNumber})` : ''}</span>
          <span aria-hidden>▾</span>
        </summary>
        <div style={styles.sectionBody}>
          <LeaderboardTable mode="week" weekNumber={weekNumber} />
        </div>
      </details>
    </div>
  )
}

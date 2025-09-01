
// app/leaderboard/page.tsx (uses EditNicknamePopover + Return link)
import Link from 'next/link'
import LeaderboardTable from '@/components/LeaderboardTable'
import EditNicknamePopover from '@/components/EditNicknamePopover'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function getCurrentWeek(){
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  const sb = createClient(url, key)
  const { data, error } = await sb.rpc('get_current_week')
  if (error) return { number: undefined }
  return data || { number: undefined }
}

export default async function Page(){
  const wk = await getCurrentWeek()
  const weekNumber = wk?.number

  return (
    <div style={{padding:'16px 20px', maxWidth: 1000, margin: '0 auto'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap: 12}}>
        <h1 style={{fontSize: 28, fontWeight: 800, marginBottom: 8}}>Leaderboard</h1>
        <div style={{display:'flex', alignItems:'center', gap: 10}}>
          <EditNicknamePopover />
          <Link href="/" className="home-link" style={{textDecoration:'none'}}>
            ⬅️ Return to Home
          </Link>
        </div>
      </div>

      <p style={{color:'#6b7280', marginBottom: 16}}>Compare weekly performance or season totals.</p>

      <section style={{marginBottom: 24}}>
        <h2 style={{fontSize: 18, fontWeight: 700, marginBottom: 8}}>This Week {weekNumber ? `(Week ${weekNumber})` : ''}</h2>
        <LeaderboardTable mode="week" weekNumber={weekNumber} />
      </section>

      <section>
        <h2 style={{fontSize: 18, fontWeight: 700, marginBottom: 8}}>Season</h2>
        <LeaderboardTable mode="season" />
      </section>
    </div>
  )
}

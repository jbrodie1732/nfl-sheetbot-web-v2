// app/league-picks/page.tsx — League Picks (pre-kickoff hidden, all profiles, aligned table)
'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import HeaderMenu from '@/components/HeaderMenu'

type Person = { user_id: string; nickname: string | null }
type PublicPick = {
  user_id: string
  pick_type: 'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER'
  game_id: number
}
type ScoredPick = {
  user_id: string
  pick_type: 'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER'
  result: 'WIN'|'LOSS'|'PUSH'
}
type Game = {
  id: number
  week_number: number
  starts_at: string | null
  favorite_team_abbr: string | null
  dog_team_abbr: string | null
  freeze_spread: number | null
  freeze_total: number | null
  away_abbr: string | null
  home_abbr: string | null
}

const PICK_TYPES: Array<PublicPick['pick_type']> = ['ATS_FAV','ATS_DOG','TOTAL_OVER','TOTAL_UNDER']

const fmt1 = (x: unknown) => {
  const n = typeof x === 'number' ? x : parseFloat(String(x ?? ''))
  return Number.isFinite(n) ? n.toFixed(1) : String(x ?? '')
}

function buildLabel(p: PublicPick, g?: Game | undefined): string {
  if (!g) return '—'
  const spread = g.freeze_spread // negative for favorite
  const total  = g.freeze_total
  const fav    = (g.favorite_team_abbr || '').toUpperCase()
  const dog    = (g.dog_team_abbr || '').toUpperCase()
  const away   = (g.away_abbr || '').toUpperCase()
  const home   = (g.home_abbr || '').toUpperCase()

  if (p.pick_type === 'ATS_FAV') {
    if (fav && spread != null) return `${fav} (-${fmt1(Math.abs(Number(spread)))})`
    if (fav) return `${fav}`
    return '—'
  }
  if (p.pick_type === 'ATS_DOG') {
    if (dog && spread != null) return `${dog} (+${fmt1(Math.abs(Number(spread)))})`
    if (dog) return `${dog}`
    return '—'
  }
  if (p.pick_type === 'TOTAL_OVER') {
    if (total != null) return `${away}/${home} o${fmt1(total)}`
    return 'Over'
  }
  if (p.pick_type === 'TOTAL_UNDER') {
    if (total != null) return `${away}/${home} u${fmt1(total)}`
    return 'Under'
  }
  return '—'
}

export default function LeaguePicksPage(){
  const [currentWeek, setCurrentWeek] = useState<number | null>(null)
  const [week, setWeek] = useState<number | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [pubPicks, setPubPicks] = useState<PublicPick[]>([])
  const [scored, setScored] = useState<ScoredPick[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)

  // bootstrap: current week
  useEffect(()=>{
    let mounted = true
    async function boot(){
      const { data, error } = await supabase.rpc('get_current_week')
      if (!mounted) return
      if (error) { setError(error.message); return }
      const n = data?.number ?? null
      setCurrentWeek(n); setWeek(n)
    }
    boot()
    return ()=>{ mounted=false }
  }, [])

  // load data for selected week
  useEffect(()=>{
    if (week == null) return
    let mounted = true
    async function load(){
      setLoading(true); setError(null)

      // 0) All profiles via SECURITY DEFINER function (shows users even with 0 picks)
      const { data: profRows, error: profErr } = await supabase.rpc('get_profile_nicknames')
      if (!mounted) return
      if (profErr) { setError(profErr.message); setLoading(false); return }
      const peopleArr: Person[] = (profRows || []).map((r:any)=>({ user_id: r.user_id, nickname: r.nickname }))
      // sort by nickname (fallback to Player-xxxx)
      peopleArr.sort((a,b)=>{
        const an = (a.nickname || `Player-${a.user_id.slice(0,8)}`).toLowerCase()
        const bn = (b.nickname || `Player-${b.user_id.slice(0,8)}`).toLowerCase()
        return an.localeCompare(bn)
      })

      // 1) Games for the week (need starts_at to enforce lock)
      const { data: gameRows, error: gameErr } = await supabase
        .from('vw_game_with_freeze')
        .select('id, week_number, starts_at, favorite_team_abbr, dog_team_abbr, freeze_spread, freeze_total, away_abbr, home_abbr')
        .eq('week_number', week)
      if (!mounted) return
      if (gameErr) { setError(gameErr.message); setLoading(false); return }
      const gameArr = (gameRows || []) as Game[]
      const gameIds = gameArr.map(g => g.id)

      // 2) Public picks for those games
      const { data: pubRows, error: pubErr } = await supabase
        .from('vw_pick_public')
        .select('user_id, pick_type, game_id')
        .in('game_id', gameIds)
      if (!mounted) return
      if (pubErr) { setError(pubErr.message); setLoading(false); return }

      // 3) Scored picks for the week
      const { data: scoredRows, error: scoreErr } = await supabase
        .from('vw_pick_scored')
        .select('user_id, pick_type, result, week_number')
        .eq('week_number', week)
      if (!mounted) return
      if (scoreErr) { setError(scoreErr.message); setLoading(false); return }

      setPeople(peopleArr)
      setGames(gameArr)
      setPubPicks((pubRows || []) as any)
      setScored((scoredRows || []) as any)
      setLoading(false)
    }
    load()

    const t = setInterval(load, 120000) // refresh every 2 minutes
    return ()=>{ mounted=false; clearInterval(t) }
  }, [week])

  const gameById = useMemo(()=>{
    const m: Record<number, Game> = {}
    for (const g of games) m[g.id] = g
    return m
  }, [games])

  const byUser = useMemo(()=>{
    const map: Record<string, { person: Person; cells: Record<string, { text: string; state: 'hidden'|'pending'|'final-win'|'final-loss'|'final-push' }> }> = {}
    for (const p of people) {
      map[p.user_id] = { person: p, cells: {} as any }
      for (const t of PICK_TYPES) map[p.user_id].cells[t] = { text: '???', state: 'hidden' }
    }

    const now = new Date()

    // fill public picks into cells (but hide until kickoff)
    for (const r of pubPicks) {
      const uid = r.user_id
      const t = r.pick_type
      if (!map[uid]) continue
      const g = gameById[r.game_id]
      if (!g) continue
      const startsAt = g.starts_at ? new Date(g.starts_at) : null
      if (!startsAt || now < startsAt) {
        // not kicked off yet → keep hidden ???
        continue
      }

      const label = buildLabel(r, g)
      const scoredHit = scored.find(s => s.user_id === uid && s.pick_type === t)
      if (scoredHit) {
        const st = scoredHit.result === 'WIN' ? 'final-win' : scoredHit.result === 'PUSH' ? 'final-push' : 'final-loss'
        map[uid].cells[t] = { text: label, state: st }
      } else {
        // started/locked but not final
        map[uid].cells[t] = { text: label || '—', state: 'pending' }
      }
    }

    return map
  }, [people, pubPicks, scored, gameById])

  const rows = useMemo(()=> Object.values(byUser), [byUser])

  const weekOptions = useMemo(()=>{
    const max = currentWeek ?? 18
    const arr: number[] = []
    for (let i=max; i>=1; i--) arr.push(i) // recent first
    return arr
  }, [currentWeek])

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="left">
          <div className="title">League Picks</div>
        </div>
        <div className="right">
          <label className="wk">
            Week:&nbsp;
            <select value={week ?? ''} onChange={e=> setWeek(Number(e.target.value))}>
              {weekOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <HeaderMenu />
        </div>
      </div>

      {loading && <div className="muted">Loading…</div>}
      {error && <div className="error">Failed to load: {error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div className="muted">No profiles found.</div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="table-wrap">
          <table className="grid">
            <colgroup>
              <col style={{width:'28%'}} />
              <col style={{width:'18%'}} />
              <col style={{width:'18%'}} />
              <col style={{width:'18%'}} />
              <col style={{width:'18%'}} />
            </colgroup>
            <thead>
              <tr>
                <th className="name">Player</th>
                <th className="pick">FAV</th>
                <th className="pick">DOG</th>
                <th className="pick">OVER</th>
                <th className="pick">UNDER</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ person, cells }) => {
                const displayName = (person.nickname ?? '').trim() || `Player-${person.user_id.slice(0,8)}`
                return (
                  <tr key={person.user_id}>
                    <td className="name">
                      <span className="name-text">{displayName}</span>
                    </td>
                    {PICK_TYPES.map(pt => {
                      const c = cells[pt]
                      return (
                        <td key={pt} className={`cell ${c.state}`}>
                          <span className="pill">{c.text || '???'}</span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .wrap { padding: 16px 20px; max-width: 1100px; margin: 0 auto; }
        .topbar { display:flex; align-items:center; justify-content:space-between; gap: 12px; margin-bottom: 12px; }
        .left, .right { display:flex; align-items:center; gap: 10px; }
        .title { font-size: 26px; font-weight: 800; }
        .wk select { padding: 6px 8px; border-radius: 8px; border: 1px solid #1f2937; background:#0b1220; color:#e5e7eb; }

        .muted { color: #94a3b8; margin-top: 6px; }
        .error { color: #fca5a5; margin-top: 6px; }

        .table-wrap { width: 100%; overflow-x: auto; }
        table.grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { padding: 10px 12px; border-bottom: 1px solid #1f2937; overflow: hidden; text-overflow: ellipsis; }
        th { font-weight: 700; width: 12.5%; color: #94a3b8; background:#0f172a; position: sticky; top: 0; z-index: 1; }
        th.name { text-align: left; }
        th.pick { text-align: center; }   /* center headers over columns */
        td { text-align: center; vertical-align: middle; font-weight: 300; }
        td.name { text-align: left; white-space: nowrap; }
        .name-text { color:#e5e7eb; overflow:hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* Center the pills perfectly within each cell */
        .pill { display:block; width: 100%; min-width: 100px; max-width: 125px; margin: 0 auto; font-size: 12px; padding: 6px 11px; border-radius: 9999px; border:1px solid #1f2937; text-align:center; font-weight: 350; letter-spacing: 0.2px; }

        /* Dark-theme states to match app */
        td.cell.hidden .pill { color: #9ca3af; background: rgba(148, 163, 184, 0.08); }
        td.cell.pending .pill { color: #fde68a; background: rgba(250, 204, 21, 0.12); border-color: rgba(250, 204, 21, 0.28); }
        td.cell.final-win .pill { color: #34d399; background: rgba(16, 185, 129, 0.16); border-color: rgba(16, 185, 129, 0.32); }
        td.cell.final-loss .pill { color: #fca5a5; background: rgba(239, 68, 68, 0.18); border-color: rgba(239, 68, 68, 0.36); }
        td.cell.final-push .pill { color: #cbd5e1; background: rgba(148, 163, 184, 0.12); }

        @media (max-width: 800px){
          th, td { padding: 8px 8px; font-size: 13px; }
          th { width: 11.0%}
          .pill { max-width: 175px; padding:6px 10px; font-weight: 300; }
          .title { font-size: 22px; }
        }
      `}</style>
    </div>
  )
}

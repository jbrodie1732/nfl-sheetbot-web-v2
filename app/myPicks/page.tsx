'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import HeaderMenu from '@/components/HeaderMenu'

type Result = 'WIN' | 'PUSH' | 'LOSS' | null

type Row = {
  week_number: number
  // Some backends use "header" (vw_game_with_freeze), others surface "game_header".
  header?: string | null
  game_header?: string | null
  pick_type: 'ATS_FAV' | 'ATS_DOG' | 'TOTAL_OVER' | 'TOTAL_UNDER'
  freeze_spread?: number | string | null
  freeze_total?: number | string | null
  result?: Result
  points?: number | null
  starts_at?: string | null
  // Field name variants for team abbreviations across views
  favorite_team_abbr?: string | null
  dog_team_abbr?: string | null
  away_abbr?: string | null
  home_abbr?: string | null
  favorite_abbr?: string | null
  dog_abbr?: string | null
  away_team_abbr?: string | null
  home_team_abbr?: string | null
}

type Cell = {
  label: string
  result: Result
  points: number | null
  starts_at: string | null
}

type WeekRow = {
  week: number
  FAV?: Cell
  DOG?: Cell
  OVER?: Cell
  UNDER?: Cell
}

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function parseTeamsFromHeader(header?: string | null): { left: string, right: string } {
  if (!header || typeof header !== 'string') return { left: '', right: '' }
  const atIndex = header.indexOf('@')
  if (atIndex === -1) return { left: header.trim(), right: '' }
  const leftRaw = header.slice(0, atIndex).trim()
  const right = header.slice(atIndex + 1).trim()
  const left = leftRaw.replace(/\s*\([^)]*\)\s*$/, '').trim()
  return { left, right }
}

function labelFromRow(r: Row): { fav?: string, dog?: string, awayHome?: string } {
  const headerStr = r.game_header ?? r.header ?? null
  const { left, right } = parseTeamsFromHeader(headerStr)

  // Prefer explicit abbrs from the view if present; cover several naming patterns.
  const fav = (r.favorite_team_abbr ?? r.favorite_abbr ?? left) || undefined
  const dog = (r.dog_team_abbr ?? r.dog_abbr ?? right) || undefined
  const away = r.away_abbr ?? r.away_team_abbr ?? undefined
  const home = r.home_abbr ?? r.home_team_abbr ?? undefined

  const awayHome =
    (away && home) ? `${away}/${home}` :
    (left && right) ? `${left}/${right}` :
    undefined

  return { fav, dog, awayHome }
}

function formatCell(r: Row): Cell {
  const names = labelFromRow(r)
  const spread = toNum(r.freeze_spread)
  const total = toNum(r.freeze_total)

  if (r.pick_type === 'ATS_FAV') {
    const team = names.fav ?? 'FAV'
    const label = spread != null ? `${team} (${spread})` : team
    return { label, result: r.result ?? null, points: r.points ?? null, starts_at: r.starts_at ?? null }
  }
  if (r.pick_type === 'ATS_DOG') {
    const team = names.dog ?? 'DOG'
    const label = spread != null ? `${team} (+${Math.abs(spread)})` : team
    return { label, result: r.result ?? null, points: r.points ?? null, starts_at: r.starts_at ?? null }
  }
  if (r.pick_type === 'TOTAL_OVER') {
    const base = names.awayHome ?? (names.fav && names.dog ? `${names.fav}/${names.dog}` : 'TOTAL')
    const tot = total != null ? `o${total}` : 'OVER'
    return { label: `${base} ${tot}`, result: r.result ?? null, points: r.points ?? null, starts_at: r.starts_at ?? null }
  }
  // TOTAL_UNDER
  const base = names.awayHome ?? (names.fav && names.dog ? `${names.fav}/${names.dog}` : 'TOTAL')
  const tot = total != null ? `u${total}` : 'UNDER'
  return { label: `${base} ${tot}`, result: r.result ?? null, points: r.points ?? null, starts_at: r.starts_at ?? null }
}

export default function MyPicksTablePage(){
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true); setError(null)
      const rpc = await supabase.rpc('get_my_picks_scored')
      if (!mounted) return
      if (rpc.error) {
        const direct = await supabase
          .from('vw_pick_scored')
          .select('*')
          .order('week_number', { ascending: false })
          .limit(400)
        if (!mounted) return
        if (direct.error) { setError(rpc.error.message); setRows([]); setLoading(false); return }
        setRows((direct.data || []) as Row[])
        setLoading(false)
        return
      }
      setRows((rpc.data || []) as Row[])
      setLoading(false)
    }
    load()
    const t = setInterval(load, 120000)
    return ()=>{ mounted = false; clearInterval(t) }
  }, [])

  const grouped: WeekRow[] = useMemo(()=>{
    const map = new Map<number, WeekRow>()
    for (const r of rows){
      const week = r.week_number
      if (!map.has(week)) map.set(week, { week })
      const wr = map.get(week)!
      const cell = formatCell(r)
      if (r.pick_type === 'ATS_FAV') wr.FAV = cell
      else if (r.pick_type === 'ATS_DOG') wr.DOG = cell
      else if (r.pick_type === 'TOTAL_OVER') wr.OVER = cell
      else if (r.pick_type === 'TOTAL_UNDER') wr.UNDER = cell
    }
    const arr = Array.from(map.values())
    arr.sort((a,b)=> b.week - a.week) // newest week first
    return arr
  }, [rows])

  function CellView({ cell }: { cell?: Cell }){
    if (!cell) return <span className="muted">—</span>
    return (
      <div className="cell">
        <span className="sel">{cell.label || '—'}</span>
        {cell.result && (
          <span className={
            'badge ' + (cell.result === 'WIN' ? 'b-win' : cell.result === 'PUSH' ? 'b-push' : 'b-loss')
          }>{cell.result}</span>
        )}
      </div>
    )
  }

  return (
    <main className="page">
      {/* Sticky top with centered title and hamburger menu on the right */}
      <header className="top">
        <div className="spacer" />
        <h1 className="title">My Picks</h1>
        {/* Scope the menu to a dark theme so its items are readable */}
        <div className="menu menu-scope" style={{ color: '#fff' }}><HeaderMenu /></div>
      </header>

      {loading && <div className="muted">Loading…</div>}
      {!loading && error && <div className="error">Error: {error}</div>}
      {!loading && !error && grouped.length === 0 && <div className="muted">No picks yet.</div>}

      {!loading && !error && grouped.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <colgroup>
              <col className="c-week" />
              <col className="c-col" />
              <col className="c-col" />
              <col className="c-col" />
              <col className="c-col" />
            </colgroup>
            <thead>
              <tr>
                <th className="week">Week</th>
                <th>FAV</th>
                <th>DOG</th>
                <th>OVER</th>
                <th>UNDER</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((wr)=> (
                <tr key={wr.week}>
                  <td className="week num">{wr.week}</td>
                  <td><CellView cell={wr.FAV} /></td>
                  <td><CellView cell={wr.DOG} /></td>
                  <td><CellView cell={wr.OVER} /></td>
                  <td><CellView cell={wr.UNDER} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .page { padding: 12px 12px 24px; color: #0f172a; }
        .top {
          position: sticky; top: 0; z-index: 30;
          display: grid; grid-template-columns: 1fr auto 1fr;
          align-items: center; height: 56px;
          background: #0b1220ee; /* dark navy for strong contrast */
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .spacer { width: 100%; height: 1px; }
        .title { text-align: center; font-size: 18px; font-weight: 700; color: #ffffff; }
        .menu { display: flex; justify-content: flex-end; padding-right: 8px; }

        /* Scope the HeaderMenu dropdown to readable colors without affecting the whole page */
        .menu-scope :global(a),
        .menu-scope :global(button),
        .menu-scope :global(li),
        .menu-scope :global(span),
        .menu-scope :global(div) {
          color: #020a1bff;
        }
        .menu-scope :global(a:hover),
        .menu-scope :global(button:hover) {
          color: #ffffff;
        }
        .menu-scope :global(.menu-panel),
        .menu-scope :global([role="menu"]),
        .menu-scope :global(.dropdown),
        .menu-scope :global(nav) {
          background: #ffffffff;
          border: 1px solid #1f2937;
        }

        .intro { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 4px 16px; }
        .links { display: flex; align-items: center; gap: 10px; }
        .link { text-decoration: underline; color: #1f2937; }
        .dot { width: 4px; height: 4px; border-radius: 9999px; background: #94a3b8; }

        .table-wrap { width: 100%; overflow-x: auto; }
        .table { width: 100%; border-collapse: collapse; table-layout: fixed; background: #fff; border-radius: 16px; overflow: hidden; }
        th, td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        thead th { text-align: left; font-weight: 600; color: #374151; background: #f9fafb; }
        td.week, th.week { width: 70px; }
        .num { text-align: right; }

        .cell { display: flex; align-items: center; gap: 8px; }
        .sel { color: #111827; }
        .badge { font-size: 11px; border-radius: 9999px; padding: 2px 8px; border: 1px solid transparent; }
        .b-win  { background: #dcfce7; color: #166534; border-color: #86efac; }
        .b-push { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }
        .b-loss { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

        .muted { color: #6b7280; padding: 12px 4px; }
        .error { color: #b91c1c; padding: 12px 4px; }

        @media (max-width: 480px){
          .title { font-size: 16px; }
          th, td { padding: 8px 8px; font-size: 13px; }
          td.week, th.week { width: 56px; }
          .sel { font-size: 13px; }
        }
      `}</style>
    </main>
  )
}

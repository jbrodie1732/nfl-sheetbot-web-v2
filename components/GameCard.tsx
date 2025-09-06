// components/GameCard.tsx — centered header + expand pill absolute + distro bars in hidden section
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fmtET } from '@/lib/time';
import DistributionBar from '@/components/DistributionBar';
import LockCountdown from '@/components/LockCountdown';

type Game = {
  id: number;
  week_number: number;
  starts_at: string;
  favorite_team_abbr: string | null;
  dog_team_abbr: string | null;
  freeze_spread: number | null;
  freeze_total: number | null;
  away_abbr: string;
  home_abbr: string;
  header: string;
  final_home_score?: number | null;
  final_away_score?: number | null;
  final_at?: string | null;
};

type PickMap = { [k: string]: { pick_type: 'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER'; game_id: number } };

type PublicPick = {
  pick_type: 'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER';
  user_id: string;
  nickname: string;
  label: string;
  created_at: string;
};

const fmt1 = (x: unknown) => {
  const n = typeof x === 'number' ? x : parseFloat(String(x ?? ''));
  return Number.isFinite(n) ? n.toFixed(1) : String(x ?? '');
};

export default function GameCard({ game, weekNumber, myPicks, onChanged, onSaved }: {
  game: Game;
  weekNumber: number;
  myPicks: PickMap;
  onChanged: () => Promise<void>;
  onSaved: (msg: string) => void;
}){
  const [busy, setBusy] = useState(false);
  const [myResult, setMyResult] = useState<{pick_type?: string, result?: string}|null>(null);
  const [pubPicks, setPubPicks] = useState<PublicPick[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const locked = Date.now() >= new Date(game.starts_at).getTime();
  const isFinal = !!game.final_at;
  const [collapsed, setCollapsed] = useState<boolean>(locked); // locked games start collapsed

  // If the card transitions into locked state after mount, collapse it
  useEffect(()=>{
    if (locked) setCollapsed(true);
  }, [locked]);

  async function choose(type: 'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER'){
    if (locked && !isFinal) return;
    setBusy(true);
    const { error } = await supabase.rpc('upsert_pick', {
      p_week_number: weekNumber,
      p_game_id: game.id,
      p_pick_type: type
    });
    if (error) {
      setBusy(false);
      alert(error.message);
      return;
    }
    await onChanged();
    onSaved('Pick Saved!');
    setBusy(false);
  }

  // Load my result when final
  useEffect(()=>{
    if (!isFinal) return;
    let mounted = true;
    async function load(){
      const { data, error } = await supabase.rpc('get_my_pick_result_for_game', { p_game_id: game.id });
      if (!mounted) return;
      if (!error && data && data.length > 0){
        setMyResult({ pick_type: data[0].pick_type, result: data[0].result });
      }
    }
    load();
    return ()=>{ mounted=false; };
  }, [isFinal, game.id]);

  // Load public picks (locked only). Use v2 function for nicknames + labels + ordering.
  const loadPublic = useCallback(async ()=>{
    if (!locked) { setPubPicks([]); return; }
    const { data, error } = await supabase.rpc('get_public_picks_for_game_v2', { p_game_id: game.id });
    if (error) { setLoadErr(error.message); setPubPicks([]); return; }
    setLoadErr(null);
    setPubPicks((data ?? []) as PublicPick[]);
  }, [game.id, locked]);

  useEffect(()=>{
    loadPublic();
    if (!locked) return;
    const id = setInterval(loadPublic, 120000); // poll every 2 minutes while locked
    return ()=> clearInterval(id);
  }, [loadPublic, locked]);

  const favSel = myPicks['ATS_FAV']?.game_id === game.id;
  const dogSel = myPicks['ATS_DOG']?.game_id === game.id;
  const overSel = myPicks['TOTAL_OVER']?.game_id === game.id;
  const underSel = myPicks['TOTAL_UNDER']?.game_id === game.id;

  const favSpreadNum = game.freeze_spread;
  const favSpread = favSpreadNum!=null ? fmt1(favSpreadNum) : '';
  const dogSpreadNum = favSpreadNum!=null ? -1*Number(favSpreadNum) : null;
  const dogSpread = dogSpreadNum!=null ? (dogSpreadNum>0?'+':'') + fmt1(dogSpreadNum) : '';
  const total = game.freeze_total!=null ? fmt1(game.freeze_total) : '';

  const headerText = useMemo(() => {
    if (game.header) return game.header;
    if (game.favorite_team_abbr && favSpreadNum!=null) {
      const fav = game.favorite_team_abbr;
      const other = (fav === game.home_abbr ? game.away_abbr : game.home_abbr) || '';
      return `${fav} (${fmt1(favSpreadNum)}) @ ${other}`;
    }
    return `${game.away_abbr} @ ${game.home_abbr}`;
  }, [game.header, game.favorite_team_abbr, favSpreadNum, game.away_abbr, game.home_abbr]);

  const favLabel = `Pick FAV: ${game.favorite_team_abbr ?? ''}${favSpread?` (${favSpread})`:''}`;
  const dogLabel = `Pick DOG: ${game.dog_team_abbr ?? ''}${dogSpread?` (${dogSpread})`:''}`;
  const overLabel = `Pick OVER ${total?`(o${total})`:''}`;
  const underLabel = `Pick UNDER ${total?`(u${total})`:''}`;

  const favSelLabel = `FAV Selected: ${game.favorite_team_abbr ?? ''}${favSpread?` (${favSpread})`:''}`;
  const dogSelLabel = `DOG Selected: ${game.dog_team_abbr ?? ''}${dogSpread?` (${dogSpread})`:''}`;
  const overSelLabel = `OVER Selected ${total?`(o${total})`:''}`;
  const underSelLabel = `UNDER Selected ${total?`(u${total})`:''}`;

  const atsLineMissing = game.favorite_team_abbr == null || game.dog_team_abbr == null || favSpreadNum == null;
  const totalLineMissing = game.freeze_total == null;

  function badgeFor(type:'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER'){
    if (!isFinal) return null;
    if (!myResult || myResult.pick_type !== type) return null;
    const r = myResult.result;
    const color = r==='WIN' ? '#10b981' : r==='PUSH' ? '#6b7280' : '#ef4444';
    return <span className="badge" style={{background: color}}>{r}</span>;
  }

  // Split public picks into the two requested columns
  const leftCol = useMemo(()=> pubPicks.filter(p => p.pick_type === 'ATS_FAV' || p.pick_type === 'ATS_DOG'), [pubPicks]);
  const rightCol = useMemo(()=> pubPicks.filter(p => p.pick_type === 'TOTAL_OVER' || p.pick_type === 'TOTAL_UNDER'), [pubPicks]);

  return (
    <div className="card" style={{marginBottom:10}}>
      {/* Header row — center stays perfectly centered via absolute side elements */}
      <div
        className={`hdr ${locked ? 'toggleable' : ''}`}
        onClick={()=> { if (locked) setCollapsed(c => !c); }}
        role={locked ? 'button' : undefined}
        aria-expanded={locked ? !collapsed : undefined}
        title={locked ? (collapsed ? 'Show details' : 'Hide details') : undefined}
      >
        {/* absolute left expand pill (doesn't affect centering) */}
        {locked && (
          <div className={`expand-abs ${collapsed ? '' : 'open'}`}>
            <span className="caret" aria-hidden>▸</span>
            <span className="hint-text">Expand for Pick Stats</span>
            <span className="emoji" aria-hidden>⤵️</span>
          </div>
        )}

        {/* absolute right lock countdown */}
        <div className="right-abs">
          <div className="lock-scale"><LockCountdown startsAtISO={game.starts_at} /></div>
        </div>

        {/* centered title */}
        <div className="title-center">{headerText}</div>
      </div>

      <div className="lock-subtext">Kickoff: {fmtET(game.starts_at)}</div>

      <div className="fact-tiles">
        <span className="tile">Fav: {game.favorite_team_abbr ?? '-'} {favSpread?`(${favSpread})`:''}</span>
        <span className="tile">Dog: {game.dog_team_abbr ?? '-' } {dogSpread?`(${dogSpread})`:''}</span>
        <span className="tile">O/U: {total || '-'}</span>
      </div>

      {/* Collapsed state hides the buttons, distribution bars, and public picks when locked */}
      {(!locked || !collapsed) && (
        <>
          <hr />

          {/* Distribution bars now live inside the expandable section */}
          {locked && (
            <div className="dists">
              <DistributionBar gameId={game.id} kind="ATS" />
              <DistributionBar gameId={game.id} kind="TOTAL" />
            </div>
          )}

          <div className="button-columns" style={{marginTop:8}}>
            <div className="col">
              <button
                disabled={busy || atsLineMissing || locked}
                title={atsLineMissing ? 'Line unavailable' : ''}
                onClick={()=>choose('ATS_FAV')}
                className={`btn ${favSel?'btn-selected':''}`}
              >
                {favSel?favSelLabel:favLabel} {badgeFor('ATS_FAV')}
              </button>
              <button
                disabled={busy || atsLineMissing || locked}
                title={atsLineMissing ? 'Line unavailable' : ''}
                onClick={()=>choose('ATS_DOG')}
                className={`btn ${dogSel?'btn-selected':''}`}
              >
                {dogSel?dogSelLabel:dogLabel} {badgeFor('ATS_DOG')}
              </button>
            </div>
            <div className="col">
              <button
                disabled={busy || totalLineMissing || locked}
                title={totalLineMissing ? 'Line unavailable' : ''}
                onClick={()=>choose('TOTAL_OVER')}
                className={`btn ${overSel?'btn-selected':''}`}
              >
                {overSel?overSelLabel:overLabel} {badgeFor('TOTAL_OVER')}
              </button>
              <button
                disabled={busy || totalLineMissing || locked}
                title={totalLineMissing ? 'Line unavailable' : ''}
                onClick={()=>choose('TOTAL_UNDER')}
                className={`btn ${underSel?'btn-selected':''}`}
              >
                {underSel?underSelLabel:underLabel} {badgeFor('TOTAL_UNDER')}
              </button>
            </div>
          </div>

          {locked && (
            <div className="public-picks">
              <div className="grid-2">
                <div>
                  <div className="sect-title">Spreads:</div>
                  {loadErr && <div className="muted">Error: {loadErr}</div>}
                  {!loadErr && leftCol.length === 0 && <div className="muted">No ATS picks.</div>}
                  <ul className="list">
                    {leftCol.map((r, idx)=>(
                      <li key={idx} className="row">
                        <span className="label">{r.label}</span>
                        <span className="nick">{r.nickname}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="sect-title">Totals:</div>
                  {!loadErr && rightCol.length === 0 && <div className="muted">No TOTAL picks.</div>}
                  <ul className="list">
                    {rightCol.map((r, idx)=>(
                      <li key={idx} className="row">
                        <span className="label">{r.label}</span>
                        <span className="nick">{r.nickname}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        /* Header: absolute side elements so the title is truly centered */
        .hdr{
          position: relative;
          display:flex;
          align-items:center;
          justify-content:center;
          min-height: 36px;
          margin-bottom: 2px;
        }
        .toggleable { cursor: pointer; user-select: none; }
        .expand-abs{
          position: absolute; left: 0; top: 0;
          display:inline-flex; align-items:center; gap:6px;
          font-size: 10px;
          color:rgba(255, 255, 255, 0.39); /* indigo-300 for visibility */
          background: rgba(7, 6, 39, 0.21); /* indigo-600 / 12% */
          border: 1px solid rgba(76, 77, 118, 0.49);
          border-radius: 9999px;
          padding: 2px 8px;
        }
        .expand-abs .caret{
          display:inline-block; transform: rotate(0deg); transition: transform .18s ease;
        }
        .expand-abs.open .caret{ transform: rotate(90deg); }
        .right-abs{ position: absolute; right: 0; top: 0; display:flex; align-items:center; }
        .title-center{ text-align:center; font-weight: 700; font-size: 20px; }

        .badge {
          margin-left: 8px;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 11px;
          color: white;
        }
        .lock-subtext { font-size: 12px; color:#94a3b8; margin-bottom: 6px; }
        .fact-tiles { display:flex; gap:8px; flex-wrap: wrap; }
        .tile { border:1px solid #1f2937; border-radius: 10px; padding: 4px 8px; color:#e5e7eb; }
        .dists { margin-top: 6px; }

        .public-picks { margin-top: 10px; }
        .grid-2 { display:grid; grid-template-columns: 1fr; gap: 10px; }
        @media(min-width: 640px){ .grid-2 { grid-template-columns: 1fr 1fr; } }

        /* Center section headers */
        .sect-title {
          display:flex;
          align-items:center;
          justify-content:center;
          font-size: 14px;
          color:#94a3b8;
          margin-bottom: 8px;
          text-align:center;
        }

        .list { display:flex; flex-direction:column; gap:8px; align-items:center; }
        /* Narrower, centered revealed-pick tiles */
        .row {
          width: min(100%, 460px);
          display:flex;
          align-items:center;
          justify-content:space-between;
          border:1px solid #1f2937;
          border-radius: 12px;
          padding: 8px 12px;
          background: rgba(148, 163, 184, 0.08);
        }
        .label { color:#e5e7eb; display:flex; align-items:center; font-size:12px;}
        .nick { color:#cbd5e1; display:flex; align-items:center; font-size:12px;}

        @media (max-width: 480px){
          .lock-scale{ transform: scale(0.85); transform-origin: top right; }
          .title-center{ font-size: 18px; }
          .row { width: 100%; }
        }
      `}</style>
    </div>
  );
}

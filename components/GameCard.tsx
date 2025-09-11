// components/GameCard.tsx — header always "AWAY @ HOME" with correct favorite annotation
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
  favorite_team_abbr: string | null; // frozen favorite abbr
  dog_team_abbr: string | null;      // frozen dog abbr
  freeze_spread: number | null;      // favorite is negative
  freeze_total: number | null;
  away_abbr: string;
  home_abbr: string;
  header?: string;                   // ignore for title; we compute explicitly
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
  const [collapsed, setCollapsed] = useState<boolean>(locked);

  useEffect(()=>{ if (locked) setCollapsed(true); }, [locked]);

  async function choose(type: 'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER'){
    if (locked && !isFinal) return;
    setBusy(true);
    const { error } = await supabase.rpc('upsert_pick', {
      p_week_number: weekNumber,
      p_game_id: game.id,
      p_pick_type: type
    });
    if (error) { setBusy(false); alert(error.message); return; }
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
    const id = setInterval(loadPublic, 120000);
    return ()=> clearInterval(id);
  }, [loadPublic, locked]);

  const favSel = myPicks['ATS_FAV']?.game_id === game.id;
  const dogSel = myPicks['ATS_DOG']?.game_id === game.id;
  const overSel = myPicks['TOTAL_OVER']?.game_id === game.id;
  const underSel = myPicks['TOTAL_UNDER']?.game_id === game.id;

  const favSpreadNum = game.freeze_spread; // negative for favorite
  const favSpreadAbs = favSpreadNum!=null ? Math.abs(Number(favSpreadNum)) : null;
  const favSpreadTxt = favSpreadAbs!=null ? fmt1(favSpreadAbs) : null;
  const total = game.freeze_total!=null ? fmt1(game.freeze_total) : '';

  // ***** FIXED HEADER LOGIC *****
  const headerText = useMemo(() => {
    const away = (game.away_abbr || '').toUpperCase();
    const home = (game.home_abbr || '').toUpperCase();
    const fav = (game.favorite_team_abbr || '').toUpperCase();

    // Dev-only debug to surface what the component thinks is away/home/fav
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      // Avoid spam by grouping by game id
      console.debug('[GameCard header]', { id: game.id, away, home, fav, freeze_spread: game.freeze_spread });
    }

    // Always show AWAY @ HOME
    if (fav && favSpreadTxt) {
      if (fav === away) return `${away} (-${favSpreadTxt}) @ ${home}`;
      if (fav === home) return `${away} @ ${home} (-${favSpreadTxt})`;
      // If abbr mismatch, still show away@home without line annotation
      return `${away} @ ${home}`;
    }
    return `${away} @ ${home}`;
  }, [game.id, game.away_abbr, game.home_abbr, game.favorite_team_abbr, favSpreadTxt, game.freeze_spread]);

  const favLabel = `Pick FAV: ${game.favorite_team_abbr ?? ''}${favSpreadTxt?` (-${favSpreadTxt})`:''}`;
  const dogLabel = `Pick DOG: ${game.dog_team_abbr ?? ''}${favSpreadTxt?` (+${favSpreadTxt})`:''}`;
  const overLabel = `Pick OVER ${total?`(o${total})`:''}`;
  const underLabel = `Pick UNDER ${total?`(u${total})`:''}`;

  const favSelLabel = `FAV Selected: ${game.favorite_team_abbr ?? ''}${favSpreadTxt?` (-${favSpreadTxt})`:''}`;
  const dogSelLabel = `DOG Selected: ${game.dog_team_abbr ?? ''}${favSpreadTxt?` (+${favSpreadTxt})`:''}`;
  const overSelLabel = `OVER Selected ${total?`(o${total})`:''}`;
  const underSelLabel = `UNDER Selected ${total?`(u${total})`:''}`;

  const atsLineMissing = !game.favorite_team_abbr || !game.dog_team_abbr || favSpreadNum == null;
  const totalLineMissing = game.freeze_total == null;

  function badgeFor(type:'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER'){
    if (!isFinal) return null;
    if (!myResult || myResult.pick_type !== type) return null;
    const r = myResult.result;
    const color = r==='WIN' ? '#10b981' : r==='PUSH' ? '#6b7280' : '#ef4444';
    return <span className="badge" style={{background: color}}>{r}</span>;
  }

  const leftCol = useMemo(()=> pubPicks.filter(p => p.pick_type === 'ATS_FAV' || p.pick_type === 'ATS_DOG'), [pubPicks]);
  const rightCol = useMemo(()=> pubPicks.filter(p => p.pick_type === 'TOTAL_OVER' || p.pick_type === 'TOTAL_UNDER'), [pubPicks]);

  return (
    <div className="card" style={{marginBottom:10}}>
      {/* Header */}
      <div
        className={`hdr ${locked ? 'toggleable' : ''}`}
        onClick={()=> { if (locked) setCollapsed(c => !c); }}
        role={locked ? 'button' : undefined}
        aria-expanded={locked ? !collapsed : undefined}
        title={locked ? (collapsed ? 'Show details' : 'Hide details') : undefined}
      >
        {locked && (
          <div className={`expand-abs ${collapsed ? '' : 'open'}`}>
            <span className="caret" aria-hidden>▸</span>
            <span className="hint-text">Expand for Pick Stats</span>
            <span className="emoji" aria-hidden>⤵️</span>
          </div>
        )}
        <div className="right-abs">
          <div className="lock-scale"><LockCountdown startsAtISO={game.starts_at} /></div>
        </div>
        <div className="title-center">{headerText}</div>
      </div>

      <div className="lock-subtext">Kickoff: {fmtET(game.starts_at)}</div>

      <div className="fact-tiles">
        <span className="tile">Fav: {game.favorite_team_abbr ?? '-'} -{favSpreadTxt}</span>
        <span className="tile">Dog: {game.dog_team_abbr ?? '-'} +{favSpreadTxt}</span>
        <span className="tile">O/U: {total || '-'}</span>
      </div>

      {(!locked || !collapsed) && (
        <>
          <hr />
          {locked && (
            <div className="dists">
              <DistributionBar gameId={game.id} kind="ATS" />
              <DistributionBar gameId={game.id} kind="TOTAL" />
            </div>
          )}

          <div className="button-columns" style={{marginTop:8}}>
            <div className="col">
              <button disabled={busy || atsLineMissing || locked} title={atsLineMissing ? 'Line unavailable' : ''} onClick={()=>choose('ATS_FAV')} className={`btn ${favSel?'btn-selected':''}`}>
                {favSel?favSelLabel:favLabel} {badgeFor('ATS_FAV')}
              </button>
              <button disabled={busy || atsLineMissing || locked} title={atsLineMissing ? 'Line unavailable' : ''} onClick={()=>choose('ATS_DOG')} className={`btn ${dogSel?'btn-selected':''}`}>
                {dogSel?dogSelLabel:dogLabel} {badgeFor('ATS_DOG')}
              </button>
            </div>
            <div className="col">
              <button disabled={busy || totalLineMissing || locked} title={totalLineMissing ? 'Line unavailable' : ''} onClick={()=>choose('TOTAL_OVER')} className={`btn ${overSel?'btn-selected':''}`}>
                {overSel?overSelLabel:overLabel} {badgeFor('TOTAL_OVER')}
              </button>
              <button disabled={busy || totalLineMissing || locked} title={totalLineMissing ? 'Line unavailable' : ''} onClick={()=>choose('TOTAL_UNDER')} className={`btn ${underSel?'btn-selected':''}`}>
                {underSel?underSelLabel:underLabel} {badgeFor('TOTAL_UNDER')}
              </button>
            </div>
          </div>

          {locked && (
            <div className="public-picks">
              <div className="grid-2">
                <div>
                  <div className="sect-title">Fav / Dog</div>
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
                  <div className="sect-title">Over / Under</div>
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
        .hdr{ position: relative; display:flex; align-items:center; justify-content:center; min-height: 36px; margin-bottom: 2px; }
        .toggleable { cursor: pointer; user-select: none; }
        .expand-abs{ position: absolute; left: 0; top: 0; display:inline-flex; align-items:center; gap:6px; font-size: 11px; color:#a5b4fc; background: rgba(79, 70, 229, 0.12); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 9999px; padding: 2px 8px; }
        .expand-abs .caret{ display:inline-block; transform: rotate(0deg); transition: transform .18s ease; }
        .expand-abs.open .caret{ transform: rotate(90deg); }
        .right-abs{ position: absolute; right: 0; top: 0; display:flex; align-items:center; }
        .title-center{ text-align:center; font-weight: 700; font-size: 20px; }

        .badge { margin-left: 8px; border-radius: 10px; padding: 2px 6px; font-size: 11px; color: white; }
        .lock-subtext { font-size: 12px; color:#94a3b8; margin-bottom: 6px; }
        .fact-tiles { display:flex; gap:8px; flex-wrap: wrap; }
        .tile { border:1px solid #1f2937; border-radius: 10px; padding: 4px 8px; color:#e5e7eb; }
        .dists { margin-top: 6px; }

        .public-picks { margin-top: 10px; }
        .grid-2 { display:grid; grid-template-columns: 1fr; gap: 10px; }
        @media(min-width: 640px){ .grid-2 { grid-template-columns: 1fr 1fr; } }

        .sect-title { display:flex; align-items:center; justify-content:center; font-size: 14px; color:#94a3b8; margin-bottom: 8px; text-align:center; }

        .list { display:flex; flex-direction:column; gap:8px; align-items:center; }
        .row { width: min(100%, 460px); display:flex; align-items:center; justify-content:space-between; border:1px solid #1f2937; border-radius: 12px; padding: 8px 12px; background: rgba(148, 163, 184, 0.08); }
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

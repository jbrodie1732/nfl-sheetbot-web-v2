
// components/GameCard.tsx (v3 - await onChanged before toast)
'use client';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fmtET } from '@/lib/time';
import DistributionBar from '@/components/DistributionBar';
import PublicPicks from '@/components/PublicPicks';
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
  const [myResult, setMyResult] = useState<{pick_type?: string, result?: string}|null>(null)
  const locked = Date.now() >= new Date(game.starts_at).getTime();
  const isFinal = !!game.final_at;

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

  useEffect(()=>{
    if (!isFinal) return
    let mounted = true
    async function load(){
      const { data, error } = await supabase.rpc('get_my_pick_result_for_game', { p_game_id: game.id })
      if (!mounted) return
      if (!error && data && data.length > 0){
        setMyResult({ pick_type: data[0].pick_type, result: data[0].result })
      }
    }
    load()
    return ()=>{ mounted=false }
  }, [isFinal, game.id])

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
    if (!isFinal) return null
    if (!myResult || myResult.pick_type !== type) return null
    const r = myResult.result
    const color = r==='WIN' ? '#10b981' : r==='PUSH' ? '#6b7280' : '#ef4444'
    return <span className="badge" style={{background: color}}>{r}</span>
  }

  return (
    <div className="card" style={{marginBottom:10}}>
      <div className="hdr-grid">
        <div />
        <div className="h2 center">{headerText}</div>
        <div className="right"><LockCountdown startsAtISO={game.starts_at} /></div>
      </div>

      <div className="lock-subtext">Kickoff: {fmtET(game.starts_at)}</div>

      <div className="fact-tiles">
        <span className="tile">Fav: {game.favorite_team_abbr ?? '-'} {favSpread?`(${favSpread})`:''}</span>
        <span className="tile">Dog: {game.dog_team_abbr ?? '-' } {dogSpread?`(${dogSpread})`:''}</span>
        <span className="tile">O/U: {total || '-'}</span>
      </div>

      {locked && (
        <div className="dists">
          <DistributionBar gameId={game.id} kind="ATS" />
          <DistributionBar gameId={game.id} kind="TOTAL" />
        </div>
      )}

      <hr />

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

      {locked && <PublicPicks gameId={game.id} locked={locked} />}

      <style jsx>{`
        .hdr-grid{
          display:grid;
          grid-template-columns: 1fr auto 1fr;
          align-items:center;
          margin-bottom: 2px;
        }
        .center{ display:flex; justify-content:center; }
        .right{ display:flex; justify-content:flex-end; }
        .badge {
          margin-left: 8px;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 11px;
          color: white;
        }
      `}</style>
    </div>
  );
}

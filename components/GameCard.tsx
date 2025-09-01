'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fmtET } from '@/lib/time';

type Game = {
  id: number;
  week_number: number;
  starts_at: string;
  favorite_team_abbr: string | null;
  dog_team_abbr: string | null;
  freeze_spread: number | null; // negative for favorite
  freeze_total: number | null;
  away_abbr: string;
  home_abbr: string;
  header: string;
};

type PickMap = { [k: string]: { pick_type: 'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER'; game_id: number } };

const fmt1 = (x: unknown) => {
  const n = typeof x === 'number' ? x : parseFloat(String(x ?? ''));
  return Number.isFinite(n) ? n.toFixed(1) : String(x ?? '');
};

export default function GameCard({ game, weekNumber, myPicks, onChanged }: {
  game: Game;
  weekNumber: number;
  myPicks: PickMap;
  onChanged: () => void;
}){
  const [busy, setBusy] = useState(false);
  const locked = Date.now() >= new Date(game.starts_at).getTime();

  async function choose(type: 'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER'){
    if (locked) return;
    setBusy(true);
    const { error } = await supabase.rpc('upsert_pick', {
      p_week_number: weekNumber,
      p_game_id: game.id,
      p_pick_type: type
    });
    setBusy(false);
    if (error) alert(error.message); else onChanged();
  }

  const favSel = myPicks['ATS_FAV']?.game_id === game.id;
  const dogSel = myPicks['ATS_DOG']?.game_id === game.id;
  const overSel = myPicks['TOTAL_OVER']?.game_id === game.id;
  const underSel = myPicks['TOTAL_UNDER']?.game_id === game.id;

  const favSpread = game.freeze_spread!=null ? fmt1(game.freeze_spread) : '';
  const dogSpread = game.freeze_spread!=null ? fmt1(-1*Number(game.freeze_spread)) : '';
  const total = game.freeze_total!=null ? fmt1(game.freeze_total) : '';

  const favLabel = `Pick FAV: ${game.favorite_team_abbr ?? ''}${favSpread?` (${favSpread})`:''}`;
  const dogLabel = `Pick DOG: ${game.dog_team_abbr ?? ''}${dogSpread?` (${dogSpread.startsWith('-')?'':'+'}${dogSpread}`:''})`;
  const overLabel = `Pick OVER ${total?`(o${total})`:''}`;
  const underLabel = `Pick UNDER ${total?`(u${total})`:''}`;

  const favSelLabel = `FAV Selected: ${game.favorite_team_abbr ?? ''}${favSpread?` (${favSpread})`:''}`;
  const dogSelLabel = `DOG Selected: ${game.dog_team_abbr ?? ''}${dogSpread?` (${dogSpread.startsWith('-')?'':'+'}${dogSpread}`:''})`;
  const overSelLabel = `OVER Selected ${total?`(o${total})`:''}`;
  const underSelLabel = `UNDER Selected ${total?`(u${total})`:''}`;

  return (
    <div className="card" style={{marginBottom:10}}>
      <div className="row" style={{justifyContent:'space-between'}}>
        <div className="h2">{game.header}</div>
        <div className="time-chip">Locks: {fmtET(game.starts_at)}</div>
      </div>
      <div className="small">Fav / Dog / O-U</div>
      <div className="button-columns" style={{marginTop:8}}>
        <div className="col">
          <button disabled={busy||locked} onClick={()=>choose('ATS_FAV')} className={`btn ${favSel?'btn-selected':''}`}>{favSel?favSelLabel:favLabel}</button>
          <button disabled={busy||locked} onClick={()=>choose('ATS_DOG')} className={`btn ${dogSel?'btn-selected':''}`}>{dogSel?dogSelLabel:dogLabel}</button>
        </div>
        <div className="col">
          <button disabled={busy||locked} onClick={()=>choose('TOTAL_OVER')} className={`btn ${overSel?'btn-selected':''}`}>{overSel?overSelLabel:overLabel}</button>
          <button disabled={busy||locked} onClick={()=>choose('TOTAL_UNDER')} className={`btn ${underSel?'btn-selected':''}`}>{underSel?underSelLabel:underLabel}</button>
        </div>
      </div>
    </div>
  );
}
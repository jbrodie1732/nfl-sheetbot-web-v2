
'use client';
import { supabase } from '@/lib/supabaseClient';
import { fmtET } from '@/lib/time';
import { useState } from 'react';

type Game = {
  id: number;
  starts_at: string;
  favorite_team_abbr: string;
  dog_team_abbr: string;
  freeze_spread: number; // negative for favorite
  freeze_total: number;
  away_abbr: string;
  home_abbr: string;
  header: string;
};

type MyPicks = {
  fav?: { game_id: number; team_abbr: string; spread: number };
  dog?: { game_id: number; team_abbr: string; spread: number };
  over?: { game_id: number; total: number };
  under?: { game_id: number; total: number };
};

export default function GameCard({ game, weekNumber, myPicks, onChanged }: {
  game: Game;
  weekNumber: number;
  myPicks: MyPicks;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const locked = Date.now() >= new Date(game.starts_at).getTime();

  async function choose(type: 'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER') {
    if (locked) return;
    setBusy(true);
    const { error } = await supabase.rpc('upsert_pick', {
      p_week_number: weekNumber,
      p_game_id: game.id,
      p_pick_type: type
    });
    setBusy(false);
    if (!error) onChanged();
    else alert(error.message);
  }

  const favSel = myPicks.fav?.game_id === game.id;
  const dogSel = myPicks.dog?.game_id === game.id;
  const overSel = myPicks.over?.game_id === game.id;
  const underSel = myPicks.under?.game_id === game.id;

  const favLabel = `Pick FAV: ${game.favorite_team_abbr} (${game.freeze_spread})`;
  const dogLabel = `Pick DOG: ${game.dog_team_abbr} (${game.freeze_spread * -1 > 0 ? '+' : ''}${(game.freeze_spread * -1).toFixed(1)})`;
  const overLabel = `Pick OVER (o${game.freeze_total})`;
  const underLabel = `Pick UNDER (u${game.freeze_total})`;

  const favSelLabel = `FAV Selected: ${game.favorite_team_abbr} (${game.freeze_spread})`;
  const dogSelLabel = `DOG Selected: ${game.dog_team_abbr} (${game.freeze_spread * -1 > 0 ? '+' : ''}${(game.freeze_spread * -1).toFixed(1)})`;
  const overSelLabel = `OVER Selected: (o${game.freeze_total})`;
  const underSelLabel = `UNDER Selected: (u${game.freeze_total})`;

  return (
    <div className="card">
      <div><strong>{game.header}</strong></div>
      <div className="lock">Game locks: {fmtET(game.starts_at)}</div>
      <div className="chips">
        <span className="chip">Fav</span>
        <span className="chip">Dog</span>
        <span className="chip">O/U</span>
      </div>
      <div className="btns">
        <button disabled={busy||locked} onClick={()=>choose('ATS_FAV')} className={`btn ${favSel ? 'on':''}`}>{favSel?favSelLabel:favLabel}</button>
        <button disabled={busy||locked} onClick={()=>choose('ATS_DOG')} className={`btn ${dogSel ? 'on':''}`}>{dogSel?dogSelLabel:dogLabel}</button>
        <button disabled={busy||locked} onClick={()=>choose('TOTAL_OVER')} className={`btn ${overSel ? 'on':''}`}>{overSel?overSelLabel:overLabel}</button>
        <button disabled={busy||locked} onClick={()=>choose('TOTAL_UNDER')} className={`btn ${underSel ? 'on':''}`}>{underSel?underSelLabel:underLabel}</button>
      </div>
    </div>
  );
}

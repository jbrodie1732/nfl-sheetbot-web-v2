
'use client';
import { useEffect, useMemo, useState } from 'react';
import MyWeekHeader from '@/components/MyWeekHeader';
import GameCard from '@/components/GameCard';
import Leaderboard from '@/components/Leaderboard';
import { supabase } from '@/lib/supabaseClient';
import { kickoffBucket, nextKickoffIso } from '@/lib/time';

type GameRow = {
  id: number;
  week_number: number;
  starts_at: string;
  submit_open_at: string | null;
  freeze_at: string | null;
  favorite_team_abbr: string;
  dog_team_abbr: string;
  freeze_spread: number;
  freeze_total: number;
  away_abbr: string;
  home_abbr: string;
  header: string;
};

type PickRow = {
  user_id: string;
  game_id: number;
  week_number: number;
  pick_type: 'ATS_FAV'|'ATS_DOG'|'TOTAL_OVER'|'TOTAL_UNDER';
  is_owner_visible: boolean;
  show_to_others: boolean;
  // view-safe columns:
  team_abbr: string | null;
  total_side: 'OVER' | 'UNDER' | null;
  spread: number | null;
  total: number | null;
};

export default function HomePage(){
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [picks, setPicks] = useState<PickRow[]>([]);
  const [userId, setUserId] = useState<string|null>(null);

  function bucketize(gs: GameRow[]){
    const map = new Map<string, GameRow[]>();
    gs.forEach(g => {
      const b = kickoffBucket(g.starts_at);
      map.set(b, [...(map.get(b) ?? []), g]);
    });
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  }

  async function loadAll(targetWeek?: number){
    // 1) Determine current week unless override env present
    let wno: number | null = null;
    const overrideEnv = process.env.NEXT_PUBLIC_APP_WEEK_NUMBER;
    if (overrideEnv) wno = Number(overrideEnv);
    else {
      const { data, error } = await supabase.rpc('get_current_week');
      if (!error) wno = (data as any)?.number ?? null;
    }
    if (targetWeek) wno = targetWeek;
    if (!wno) return;
    setWeekNumber(wno);

    // 2) User id (for ownership checks)
    const { data: u } = await supabase.auth.getUser();
    setUserId(u.user?.id ?? null);

    // 3) Games with frozen lines
    const { data: gamesRows } = await supabase.from('vw_game_with_freeze').select('*').eq('week_number', wno).order('starts_at', { ascending: true });
    setGames((gamesRows as GameRow[]) ?? []);

    // 4) Picks (view hides others until kickoff)
    const { data: picksRows } = await supabase.from('vw_pick_public').select('*').eq('week_number', wno);
    setPicks((picksRows as PickRow[]) ?? []);
  }

  useEffect(()=>{
    loadAll();
    const ch = supabase.channel('public:pick')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pick' }, () => loadAll(weekNumber ?? undefined))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const my = useMemo(() => {
    const mine = picks.filter(p => p.user_id === userId);
    const obj: any = {};
    for (const p of mine) {
      if (p.pick_type === 'ATS_FAV') obj.fav = { game_id: p.game_id, team_abbr: p.team_abbr!, spread: p.spread! };
      if (p.pick_type === 'ATS_DOG') obj.dog = { game_id: p.game_id, team_abbr: p.team_abbr!, spread: p.spread! };
      if (p.pick_type === 'TOTAL_OVER') obj.over = { game_id: p.game_id, total: p.total! };
      if (p.pick_type === 'TOTAL_UNDER') obj.under = { game_id: p.game_id, total: p.total! };
    }
    return obj;
  }, [picks, userId]);

  const nextKick = useMemo(() => nextKickoffIso(games.map(g=>g.starts_at)), [games]);
  const buckets = bucketize(games);

  return (
    <div>
      <MyWeekHeader
        weekNumber={weekNumber ?? 0}
        submitOpenAt={games[0]?.submit_open_at ?? null}
        freezeAt={games[0]?.freeze_at ?? null}
        nextKickoff={nextKick}
      />
      <div className="container">
        <div className="progress">
          <span className="chip">{my.fav ? `FAV • ${my.fav.team_abbr} (${my.fav.spread}) ✓` : 'FAV'}</span>
          <span className="chip">{my.dog ? `DOG • ${my.dog.team_abbr} (${my.dog.spread}) ✓` : 'DOG'}</span>
          <span className="chip">{my.over ? `OVER • o${my.over.total} ✓` : 'OVER'}</span>
          <span className="chip">{my.under ? `UNDER • u${my.under.total} ✓` : 'UNDER'}</span>
        </div>

        {buckets.map(([label, list]) => (
          <div key={label}>
            <h3 className="section-title">{label}</h3>
            <div className="grid">
              {list.map(g => (
                <GameCard key={g.id} game={g} weekNumber={weekNumber ?? 0} myPicks={my} onChanged={()=>loadAll(weekNumber ?? undefined)} />
              ))}
            </div>
          </div>
        ))}

        <Leaderboard leagueId={null} weekNumber={weekNumber ?? 0} />
      </div>
    </div>
  );
}

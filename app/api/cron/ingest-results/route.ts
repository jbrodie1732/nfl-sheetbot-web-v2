// app/api/cron/ingest-results/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'; // ensure Node runtime for fetch & timing

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const TARGET_WEEK_NUMBER = process.env.TARGET_WEEK_NUMBER ? Number(process.env.TARGET_WEEK_NUMBER) : undefined;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server env');
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ESPN summary endpoint
const summaryUrl = (eid:string|number) =>
  `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${eid}`;

type GameRow = {
  id: number;
  espn_game_id: string | null;
  starts_at: string;
  final_at: string | null;
  week_number: number;
  home_team_id: number | null;
  away_team_id: number | null;
};

export async function GET(){
  try {
    const now = new Date().toISOString();
    // Pull candidate games: started already, not finalized
    const { data: games, error } = await sb
      .from('game')
      .select('id, espn_game_id, starts_at, final_at, week_number, home_team_id, away_team_id')
      .is('final_at', null)
      .lt('starts_at', now)
      .order('starts_at', { ascending: true });

    if (error) throw error;
    if (!games || games.length === 0) return NextResponse.json({ ok: true, processed: 0 });

    let processed = 0, finalized = 0;
    for (const g of games as GameRow[]){
      if (!g.espn_game_id) continue;

      const res = await fetch(summaryUrl(g.espn_game_id), { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();

      // Navigate ESPN structure
      const comp = json?.competitions?.[0] || {};
      const status = comp?.status?.type?.state || comp?.status?.type?.name; // 'post', 'final'
      const completed = comp?.status?.type?.completed ?? (status === 'post' || status === 'final');

      // scores
      const competitors = comp?.competitors || json?.header?.competitions?.[0]?.competitors || [];
      const home = competitors.find((c:any)=>c.homeAway === 'home');
      const away = competitors.find((c:any)=>c.homeAway === 'away');
      const homeScore = home ? Number(home.score) : null;
      const awayScore = away ? Number(away.score) : null;

      const updates: any = { results_snapshot: json };

      if (completed && homeScore != null && awayScore != null){
        updates.final_home_score = homeScore;
        updates.final_away_score = awayScore;
        updates.final_at = new Date().toISOString();
      }

      // Update game row
      const { error: uerr } = await sb.from('game').update(updates).eq('id', g.id);
      if (uerr) throw uerr;

      processed++;
      if (updates.final_at) finalized++;
    }

    return NextResponse.json({ ok: true, processed, finalized });
  } catch (e:any){
    return NextResponse.json({ ok:false, error: e.message }, { status: 500 });
  }
}


'use client';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MyWeekHeader from '@/components/MyWeekHeader';
import GameCard from '@/components/GameCard';
import Leaderboard from '@/components/Leaderboard';

type PickType = 'ATS_FAV' | 'ATS_DOG' | 'TOTAL_OVER' | 'TOTAL_UNDER';
type PickMap = { [k: string]: { pick_type: PickType; game_id: number } };

type GameRow = {
  id: number;
  week_number: number;
  starts_at: string;
  submit_open_at: string | null;
  freeze_at: string | null;
  favorite_team_abbr: string | null;
  dog_team_abbr: string | null;
  freeze_spread: number | null;
  freeze_total: number | null;
  away_abbr: string;
  home_abbr: string;
  header: string;
};

function etParts(iso: string) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    day: '2-digit',
    month: '2-digit'
  }).formatToParts(d);
  const obj: Record<string,string> = {};
  parts.forEach(p => { (obj as any)[p.type] = p.value; });
  const hour12 = parseInt(obj.hour || '0', 10);
  const isPM = (obj.dayPeriod || '').toLowerCase().includes('pm');
  const hour24 = (hour12 % 12) + (isPM ? 12 : 0);
  return { weekday: obj.weekday, hour12, hour24, minute: obj.minute };
}

function slotLabel(iso: string): string {
  const p = etParts(iso);
  const wd = p.weekday;
  const hm = `${p.hour12}:${p.minute}`;
  const hm24 = p.hour24 * 60 + parseInt(p.minute, 10);
  if (wd === 'Sunday') {
    if (hm24 >= (20*60) && hm24 <= (21*60)) return 'SNF';
    if (hm24 >= (9*60) && hm24 <= (9*60 + 45)) return 'Sun 9:30';
    if (hm === '1:00') return 'Sun 1:00';
    if (hm === '4:05') return 'Sun 4:05';
    if (hm === '4:25') return 'Sun 4:25';
    return `Sun ${hm}`;
  }
  if (wd === 'Monday') {
    if (hm24 >= (20*60) && hm24 <= (21*60)) return 'MNF';
    return `Mon ${hm}`;
  }
  if (wd === 'Thursday') return 'Thu';
  if (wd === 'Saturday') return `Sat ${hm}`;
  if (wd === 'Friday') return 'Fri';
  return `${wd.slice(0,3)} ${hm}`;
}

export default function Page(){
  const [weekNumber, setWeekNumber] = useState<number>(0);
  const [rows, setRows] = useState<GameRow[]>([]);
  const [me, setMe] = useState<any>(null);
  const [pickMap, setPickMap] = useState<PickMap>({});

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setMe(user ?? null);

    const overrideEnv = process.env.NEXT_PUBLIC_APP_WEEK_NUMBER;
    let wno = overrideEnv ? Number(overrideEnv) : null;
    if (!wno) {
      const { data, error } = await supabase.rpc('get_current_week');
      if (!error && data?.number) wno = Number(data.number);
    }
    if (!wno) return;
    setWeekNumber(wno);

    const { data: gs } = await supabase
      .from('vw_game_with_freeze')
      .select('*')
      .eq('week_number', wno)
      .order('starts_at', { ascending: true });
    const games = (gs as GameRow[] ?? []).slice().sort((a,b)=> new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    setRows(games);

    if (user) {
      const { data: my } = await supabase
        .from('vw_pick_public')
        .select('pick_type, game_id, week_number')
        .eq('user_id', user.id)
        .eq('week_number', wno);
      const m: PickMap = {};
      (my || []).forEach((p: any) => {
        const pt = p.pick_type as PickType;
        m[pt] = { pick_type: pt, game_id: p.game_id };
      });
      setPickMap(m);
    } else {
      setPickMap({});
    }
  }, []);

  useEffect(()=>{
    load();
    const ch = supabase.channel('public:pick')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pick' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const nextKickoffISO = useMemo(() => {
    const now = Date.now();
    const future = rows.filter(r => new Date(r.starts_at).getTime() > now);
    future.sort((a,b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    return future[0]?.starts_at ?? null;
  }, [rows]);

  const summaryByType = useMemo(() => {
    const byId: Record<number, GameRow> = {};
    rows.forEach(r => { byId[r.id] = r; });
    const out: Record<string, string> = {};
    const favId = pickMap['ATS_FAV']?.game_id;
    const dogId = pickMap['ATS_DOG']?.game_id;
    const overId = pickMap['TOTAL_OVER']?.game_id;
    const underId = pickMap['TOTAL_UNDER']?.game_id;
    const fmt1 = (x: unknown) => {
      const n = typeof x === 'number' ? x : parseFloat(String(x ?? ''));
      return Number.isFinite(n) ? n.toFixed(1) : String(x ?? '');
    };
    if (favId && byId[favId]) {
      const r = byId[favId];
      const abbr = r.favorite_team_abbr ?? '';
      out['ATS_FAV'] = r.freeze_spread!=null ? `${abbr} (${fmt1(r.freeze_spread)})` : abbr;
    }
    if (dogId && byId[dogId]) {
      const r = byId[dogId];
      const abbr = r.dog_team_abbr ?? '';
      const dogSpread = r.freeze_spread!=null ? -1*Number(r.freeze_spread) : null;
      out['ATS_DOG'] = dogSpread!=null ? `${abbr} (${dogSpread>0?'+':''}${fmt1(dogSpread)})` : abbr;
    }
    if (overId && byId[overId]) {
      const r = byId[overId];
      const matchup = `${r.away_abbr}/${r.home_abbr}`;
      out['TOTAL_OVER'] = r.freeze_total!=null ? `${matchup} o${fmt1(r.freeze_total)}` : matchup + ' OVER';
    }
    if (underId && byId[underId]) {
      const r = byId[underId];
      const matchup = `${r.away_abbr}/${r.home_abbr}`;
      out['TOTAL_UNDER'] = r.freeze_total!=null ? `${matchup} u${fmt1(r.freeze_total)}` : matchup + ' UNDER';
    }
    return out;
  }, [rows, pickMap]);

  const grouped = useMemo(() => {
    const groups: Array<{ label: string; items: GameRow[] }> = [];
    let currentLabel: string | null = null;
    let bucket: GameRow[] = [];
    rows.forEach((r) => {
      const label = slotLabel(r.starts_at);
      if (label !== currentLabel) {
        if (bucket.length) groups.push({ label: currentLabel!, items: bucket });
        currentLabel = label; bucket = [];
      }
      bucket.push(r);
    });
    if (bucket.length) groups.push({ label: currentLabel!, items: bucket });
    return groups;
  }, [rows]);

  if (!me) {
    return (
      <div className="container">
        <div className="card center">
          <h1 className="h1">SHEET MEAT | WEEK {weekNumber || ''}</h1>
          <p className="small">You are not signed in.</p>
          <a className="btn" href="/login">Sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <MyWeekHeader
        weekNumber={weekNumber}
        submitOpenAt={rows[0]?.submit_open_at}
        freezeAt={rows[0]?.freeze_at}
        nextKickoffISO={nextKickoffISO}
        summaryByType={summaryByType}
      />

      <div className="container">
        {grouped.map(group => (
          <div key={group.label}>
            <div className="section-title">{group.label}</div>
            {group.items.map((r) => (
              <GameCard key={r.id} weekNumber={weekNumber} game={r as any} myPicks={pickMap} onChanged={load} />
            ))}
          </div>
        ))}

        <Leaderboard weekNumber={weekNumber} />
      </div>
    </div>
  );
}

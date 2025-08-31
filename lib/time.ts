
export function fmtET(dtIso: string | number | Date) {
  const d = new Date(dtIso);
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  };
  return new Intl.DateTimeFormat('en-US', opts).format(d) + " ET";
}

export function kickoffBucket(dtIso: string) {
  const d = new Date(dtIso);
  const tz = 'America/New_York';
  const opts: Intl.DateTimeFormatOptions = { timeZone: tz, weekday: 'short', hour: 'numeric', minute:'2-digit', hour12: true };
  const label = new Intl.DateTimeFormat('en-US', opts).format(d);
  // Normalize to known buckets
  const hours = Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false}).format(d));
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short'}).format(d);
  if (weekday === 'Thu') return 'Thu';
  if (weekday === 'Mon') return 'MNF';
  if (weekday === 'Sun') {
    if (hours === 9) return 'Sun 9:30';
    if (hours === 13) return 'Sun 1:00';
    if (hours === 16) {
      const mins = Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, minute: 'numeric'}).format(d));
      return mins >= 20 ? 'Sun 4:25' : 'Sun 4:05';
    }
    return hours>=19 ? 'SNF' : label;
  }
  if (weekday == 'Fri') return 'Fri';
  if (weekday == 'Sat') return 'Sat';
  return label;
}

export function nextKickoffIso(starts: string[]): string | null {
  const now = Date.now();
  const upcoming = starts.map(s => new Date(s).getTime()).filter(t => t > now).sort((a,b)=>a-b);
  return upcoming.length ? new Date(upcoming[0]).toISOString() : null;
}

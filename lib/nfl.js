const SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

async function fetchJson(url, revalidate = 0) {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) {
    throw new Error(`ESPN API request failed: ${res.status}`);
  }
  return res.json();
}

export async function getNflSchedule() {
  const data = await fetchJson(SCOREBOARD_URL, 600);
  const events = Array.isArray(data.events) ? data.events : [];
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  return events.map((ev) => {
    const comp = ev.competitions?.[0];
    const away = comp?.competitors?.find((c) => c.homeAway === 'away')?.team?.abbreviation || 'TBD';
    const home = comp?.competitors?.find((c) => c.homeAway === 'home')?.team?.abbreviation || 'TBD';
    const time = formatter.format(new Date(ev.date));
    return {
      id: ev.id,
      away,
      home,
      time,
    };
  });
}
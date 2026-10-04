// Build-time GitHub data for the skills section. Static site, so this runs once
// per build, never per request. Every piece is optional: a rate limit or network
// failure during a Cloudflare build returns null for that piece and the section
// just omits it, rather than failing the deploy.
//
// No token is needed. The contribution calendar comes from the public
// /users/<name>/contributions HTML fragment (the GraphQL API would need a
// token); repos come from the REST API. Set GITHUB_TOKEN at build time to lift
// the 60 requests/hour unauthenticated limit, which shared build IPs can hit.

export interface CalendarDay {
  date: string;
  count: number;
  level: number;
}

export interface Contributions {
  weeks: (CalendarDay | null)[][];
  total: number;
  currentStreak: number;
  longestStreak: number;
  from: string;
  to: string;
}

export interface LanguageShare {
  name: string;
  percent: number;
}

export interface GithubStats {
  commits: number | null;
  repos: number | null;
  yearsActive: number | null;
  contributions: Contributions | null;
  languages: LanguageShare[] | null;
}

const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function getJson(url: string) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function loadContributions(username: string): Promise<Contributions | null> {
  try {
    const res = await fetch(`https://github.com/users/${username}/contributions`);
    if (!res.ok) return null;
    const html = await res.text();

    const counts = new Map<string, number>();
    for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>\s*(No|\d+) contributions?/g)) {
      counts.set(m[1], m[2] === 'No' ? 0 : Number(m[2]));
    }

    // Cell ids are contribution-day-component-<weekday row>-<week column>.
    const weeks: (CalendarDay | null)[][] = [];
    const days: CalendarDay[] = [];
    for (const m of html.matchAll(/<td\b[^>]*>/g)) {
      const tag = m[0];
      const date = tag.match(/data-date="([^"]+)"/)?.[1];
      const id = tag.match(/\bid="contribution-day-component-(\d+)-(\d+)"/);
      const level = tag.match(/data-level="(\d)"/)?.[1];
      if (!date || !id || level === undefined) continue;
      const fullId = `contribution-day-component-${id[1]}-${id[2]}`;
      const day: CalendarDay = { date, count: counts.get(fullId) ?? 0, level: Number(level) };
      const col = Number(id[2]);
      (weeks[col] ??= Array(7).fill(null))[Number(id[1])] = day;
      days.push(day);
    }
    if (days.length === 0) return null;

    days.sort((a, b) => a.date.localeCompare(b.date));
    let longest = 0;
    let run = 0;
    for (const d of days) {
      run = d.count > 0 ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    // An empty "today" doesn't break a streak: the day isn't over yet.
    let current = 0;
    let i = days.length - 1;
    if (days[i].count === 0) i -= 1;
    for (; i >= 0 && days[i].count > 0; i -= 1) current += 1;

    return {
      weeks: weeks.filter(Boolean),
      total: days.reduce((sum, d) => sum + d.count, 0),
      currentStreak: current,
      longestStreak: longest,
      from: days[0].date,
      to: days[days.length - 1].date,
    };
  } catch {
    return null;
  }
}

// Share of the user's own repos by GitHub's primary language label. This is a
// count of repos, not bytes of code (that would need one API call per repo).
async function loadLanguages(username: string): Promise<LanguageShare[] | null> {
  try {
    const tally = new Map<string, number>();
    for (let page = 1; page <= 10; page += 1) {
      const repos = await getJson(
        `https://api.github.com/users/${username}/repos?type=owner&per_page=100&page=${page}`,
      );
      for (const r of repos) {
        if (r.fork || !r.language) continue;
        tally.set(r.language, (tally.get(r.language) ?? 0) + 1);
      }
      if (repos.length < 100) break;
    }
    const total = [...tally.values()].reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    return [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, n]) => ({ name, percent: Math.round((n / total) * 1000) / 10 }));
  } catch {
    return null;
  }
}

export async function loadGithubStats(username: string): Promise<GithubStats | null> {
  const [user, commits, contributions, languages] = await Promise.all([
    getJson(`https://api.github.com/users/${username}`).catch(() => null),
    getJson(`https://api.github.com/search/commits?q=author:${username}`).catch(() => null),
    loadContributions(username),
    loadLanguages(username),
  ]);
  if (!user && !commits && !contributions && !languages) return null;
  return {
    commits: commits?.total_count ?? null,
    repos: user?.public_repos ?? null,
    yearsActive: user
      ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null,
    contributions,
    languages,
  };
}

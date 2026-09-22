// Self-hosted replacement for github-readme-stats (whose public instance is down).
// Reads the GitHub GraphQL API and writes theme-aware cards:
//   assets/stats/overview-<dark|light>.svg
//   assets/stats/languages-<dark|light>.svg
// Needs GITHUB_TOKEN (the Actions token is enough; only public data is read).
import { writeFileSync, mkdirSync } from "node:fs";
import { THEMES, SANS, MONO, MOTION_GUARD, esc } from "./theme.mjs";

const LOGIN = process.env.PROFILE_LOGIN || "gowtham-creator";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!TOKEN) { console.error("GITHUB_TOKEN is required"); process.exit(1); }
// Notebook byte counts are dominated by embedded outputs, not code, so they would
// distort the language split.
const EXCLUDE_LANGS = new Set(["Jupyter Notebook"]);

async function gql(query, variables) {
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": LOGIN },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

async function fetchAll() {
  const q = `query($login:String!,$after:String){
    user(login:$login){
      contributionsCollection{
        totalCommitContributions totalPullRequestContributions restrictedContributionsCount
        contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } }
      }
      repositories(ownerAffiliations:OWNER, privacy:PUBLIC, isFork:false, first:100, after:$after){
        totalCount pageInfo{ hasNextPage endCursor }
        nodes{ languages(first:10, orderBy:{field:SIZE,direction:DESC}){ edges{ size node{ name color } } } }
      }
    }
  }`;
  let after = null, repos = [], cc = null, total = 0;
  do {
    const d = await gql(q, { login: LOGIN, after });
    cc = cc || d.user.contributionsCollection;
    total = d.user.repositories.totalCount;
    repos = repos.concat(d.user.repositories.nodes);
    after = d.user.repositories.pageInfo.hasNextPage ? d.user.repositories.pageInfo.endCursor : null;
  } while (after);
  return { cc, repos, total };
}

function streaks(days) {
  const today = new Date().toISOString().slice(0, 10);
  let longest = 0, run = 0;
  for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  let i = days.length - 1;
  if (days[i] && days[i].date === today && days[i].contributionCount === 0) i--; // today is not over yet
  let current = 0;
  for (; i >= 0 && days[i].contributionCount > 0; i--) current++;
  return { current, longest, active: days.filter((d) => d.contributionCount > 0).length };
}

const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);

function overview(data, theme) {
  const T = THEMES[theme];
  const W = 430, H = 214;
  const days = data.cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
  const s = streaks(days);
  const metrics = [
    ["contributions", fmt(data.cc.contributionCalendar.totalContributions), T.accent],
    ["active days", fmt(s.active), T.green],
    ["current streak", `${s.current}d`, T.orange],
    ["commits", fmt(data.cc.totalCommitContributions), T.accent],
    ["pull requests", fmt(data.cc.totalPullRequestContributions), T.purple],
    ["longest streak", `${s.longest}d`, T.orange],
  ];
  const cells = metrics.map(([label, value, color], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 22 + col * 134, y = 70 + row * 56;
    return `<g class="m" style="animation-delay:${i * 70}ms"><text x="${x}" y="${y}" style="font:700 22px ${SANS}" fill="${color}">${esc(value)}</text>` +
      `<text x="${x}" y="${y + 18}" style="font:11px ${MONO}" fill="${T.muted}">${esc(label)}</text></g>`;
  }).join("");
  // Weekly activity bars along the bottom.
  const weeks = data.cc.contributionCalendar.weeks.map((w) => w.contributionDays.reduce((a, d) => a + d.contributionCount, 0));
  const max = Math.max(1, ...weeks), bw = (W - 44) / weeks.length;
  const bars = weeks.map((v, i) => {
    const h = v ? Math.max(2, (v / max) * 28) : 1.5;
    return `<rect x="${(22 + i * bw).toFixed(1)}" y="${(H - 18 - h).toFixed(1)}" width="${(bw - 1.4).toFixed(1)}" height="${h.toFixed(1)}" rx="1" fill="${v ? T.green : T.track}" opacity="${v ? (0.45 + 0.55 * v / max).toFixed(2) : 1}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub activity over the last year">
<title>GitHub activity, last 12 months</title>
<style>.m{animation:f .6s ease both}@keyframes f{from{opacity:0}to{opacity:1}}${MOTION_GUARD}</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="${T.tile}" stroke="${T.stroke}"/>
<text x="22" y="30" style="font:600 13px ${MONO}" fill="${T.accent}">$ git log --since="1 year"</text>
${cells}
${bars}
</svg>`;
}

function languages(data, theme) {
  const T = THEMES[theme];
  const W = 430, H = 214;
  const agg = new Map();
  for (const r of data.repos) for (const e of r.languages.edges) {
    if (EXCLUDE_LANGS.has(e.node.name)) continue;
    const cur = agg.get(e.node.name) || { size: 0, color: e.node.color || T.muted };
    cur.size += e.size; agg.set(e.node.name, cur);
  }
  const sorted = [...agg.entries()].sort((a, b) => b[1].size - a[1].size);
  const total = sorted.reduce((a, [, v]) => a + v.size, 0) || 1;
  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7).reduce((a, [, v]) => a + v.size, 0);
  if (rest > 0) top.push(["Other", { size: rest, color: T.muted }]);
  let x = 22; const barW = W - 44;
  const seg = top.map(([, v]) => {
    const w = (v.size / total) * barW;
    const r = `<rect x="${x.toFixed(1)}" y="52" width="${Math.max(w - 1.5, 0.5).toFixed(1)}" height="10" fill="${v.color}"/>`;
    x += w; return r;
  }).join("");
  const legend = top.map(([name, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const lx = 22 + col * 200, ly = 94 + row * 28;
    const pct = ((v.size / total) * 100).toFixed(1);
    return `<g class="m" style="animation-delay:${i * 60}ms"><circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${v.color}"/>` +
      `<text x="${lx + 16}" y="${ly}" style="font:500 12.5px ${SANS}" fill="${T.text}">${esc(name)}</text>` +
      `<text x="${lx + 178}" y="${ly}" text-anchor="end" style="font:12px ${MONO}" fill="${T.muted}">${pct}%</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Most used languages in public repositories">
<title>Most used languages, public repositories</title>
<style>.m{animation:f .6s ease both}@keyframes f{from{opacity:0}to{opacity:1}}${MOTION_GUARD}</style>
<defs><clipPath id="bar"><rect x="22" y="52" width="${barW}" height="10" rx="5"/></clipPath></defs>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="${T.tile}" stroke="${T.stroke}"/>
<text x="22" y="30" style="font:600 13px ${MONO}" fill="${T.accent}">$ linguist --top</text>
<text x="${W - 22}" y="30" text-anchor="end" style="font:11px ${MONO}" fill="${T.muted}">${data.total} public repos</text>
<g clip-path="url(#bar)">${seg}</g>
${legend}
</svg>`;
}

const data = await fetchAll();
mkdirSync("assets/stats", { recursive: true });
for (const theme of ["dark", "light"]) {
  writeFileSync(`assets/stats/overview-${theme}.svg`, overview(data, theme));
  writeFileSync(`assets/stats/languages-${theme}.svg`, languages(data, theme));
}
const days = data.cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
console.log(`stats: ${data.cc.contributionCalendar.totalContributions} contributions, ${data.total} public repos, streak`, streaks(days));

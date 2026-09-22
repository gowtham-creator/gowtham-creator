// Animated terminal banner. The typing effect is SMIL on clip rectangles whose *static*
// width is the full line, so a viewer without SMIL still shows every line.
// Output: assets/banner-<dark|light>.svg
import { writeFileSync, mkdirSync } from "node:fs";
import { THEMES, SANS, MONO, MOTION_GUARD, esc } from "./theme.mjs";

const W = 860, H = 250;
const LINES = [
  { prompt: true, text: "whoami" },
  { text: "Nayini Gowtham Reddy", big: true },
  { prompt: true, text: "cat role.txt" },
  { text: "AI Engineer  ·  Full-Stack Engineer  ·  Hyderabad, India", key: "text" },
  { prompt: true, text: "echo $BUILDING" },
  { text: "agentic RAG  ·  evals & guardrails  ·  Next.js in production  ·  3D web", key: "green" },
];

function build(theme) {
  const T = THEMES[theme];
  const CHAR = 7.8, TYPE_MS = 45, PAUSE = 350;
  let t = 400, y = 74;
  const clips = [], texts = [];
  let lastEnd = 0, lastX = 0, lastY = 0;
  LINES.forEach((ln, i) => {
    const x = 28;
    const content = ln.prompt ? `~ $ ${ln.text}` : ln.text;
    const size = ln.big ? 22 : 14;
    const cw = ln.big ? 12.8 : CHAR;
    const width = Math.ceil(content.length * cw) + 6;
    const dur = ln.prompt ? ln.text.length * TYPE_MS : 260;
    const start = t, end = t + dur;
    const total = 9000;
    const k1 = (start / total).toFixed(4), k2 = (end / total).toFixed(4);
    clips.push(
      `<clipPath id="c${i}"><rect x="${x - 2}" y="${y - size - 4}" height="${size + 12}" width="${width}">` +
      `<animate attributeName="width" dur="${total}ms" fill="freeze" calcMode="linear" ` +
      `keyTimes="0;${k1};${k2};1" values="0;0;${width};${width}"/></rect></clipPath>`
    );
    const fill = ln.prompt ? T.muted : ln.key === "green" ? T.green : ln.big ? T.text : T.accent;
    const weight = ln.big ? 700 : ln.prompt ? 400 : 500;
    const family = ln.big ? SANS : MONO;
    let inner = esc(content);
    if (ln.prompt) inner = `<tspan fill="${T.green}">~</tspan> <tspan fill="${T.accent}">$</tspan> <tspan fill="${T.text}">${esc(ln.text)}</tspan>`;
    texts.push(`<text x="${x}" y="${y}" clip-path="url(#c${i})" style="font:${weight} ${size}px ${family}" fill="${fill}">${inner}</text>`);
    lastEnd = end; lastX = x + width; lastY = y;
    t = end + PAUSE;
    y += ln.big ? 30 : ln.prompt ? 26 : 34;
  });
  const cursorY = y - 12;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Nayini Gowtham Reddy, AI Engineer and Full-Stack Engineer">
<title>Nayini Gowtham Reddy: AI Engineer, Full-Stack Engineer</title>
<style>${MOTION_GUARD}</style>
<defs>${clips.join("")}
<linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${T.accent}"/><stop offset=".55" stop-color="${T.purple}"/><stop offset="1" stop-color="${T.green}"/></linearGradient></defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="${T.window}" stroke="${T.stroke}"/>
<rect x="1" y="1" width="${W - 2}" height="3" rx="1.5" fill="url(#g)"/>
<circle cx="26" cy="26" r="6" fill="#ff5f57"/><circle cx="46" cy="26" r="6" fill="#febc2e"/><circle cx="66" cy="26" r="6" fill="#28c840"/>
<text x="${W / 2}" y="30" text-anchor="middle" style="font:12px ${MONO}" fill="${T.muted}">gowtham@github: ~</text>
${texts.join("\n")}
<rect x="28" y="${cursorY}" width="9" height="16" fill="${T.accent}"><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.5;.5;1" dur="1.1s" repeatCount="indefinite"/></rect>
</svg>`;
}

mkdirSync("assets", { recursive: true });
for (const theme of ["dark", "light"]) writeFileSync(`assets/banner-${theme}.svg`, build(theme));
console.log("banner: dark + light");

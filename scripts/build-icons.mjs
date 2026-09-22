// Builds one theme-aware SVG per skill group from the `thesvg` icon package.
// Output: assets/skills/<group>-<dark|light>.svg
import { writeFileSync, mkdirSync } from "node:fs";
import { THEMES, SANS, MONO, MOTION_GUARD, esc } from "./theme.mjs";

const GROUPS = [
  { id: "ai", title: "~/skills/ai-llm", items: [
    ["claude", "Claude"], ["openai", "OpenAI"], ["google-gemini", "Gemini"], ["meta", "Llama"],
    ["mistral", "Mistral"], ["ollama", "Ollama"], ["langchain", "LangChain"], ["langgraph", "LangGraph"],
    ["llamaindex", "LlamaIndex"], ["crewai", "CrewAI"], ["claude-code", "Claude Code"], ["n8n", "n8n"],
    ["pinecone", "Pinecone"], ["chroma", "Chroma"],
  ]},
  { id: "ml", title: "~/skills/ml-data", items: [
    ["python", "Python"], ["pytorch", "PyTorch"], ["tensorflow", "TensorFlow"], ["keras", "Keras"],
    ["scikit-learn", "scikit-learn"], ["pandas", "pandas"], ["numpy", "NumPy"], ["opencv", "OpenCV"],
    ["jupyter", "Jupyter"], ["streamlit", "Streamlit"],
  ]},
  { id: "frontend", title: "~/skills/frontend", items: [
    ["react", "React"], ["nextdotjs", "Next.js"], ["typescript", "TypeScript"], ["javascript", "JavaScript"],
    ["tailwindcss", "Tailwind"], ["shadcn-ui", "shadcn/ui"], ["threedotjs", "Three.js"], ["gsap", "GSAP"],
    ["framer", "Framer Motion"], ["vite", "Vite"], ["html5", "HTML5"], ["css3", "CSS3"],
    ["figma", "Figma"], ["flutter", "Flutter"], ["dart", "Dart"],
  ]},
  { id: "backend", title: "~/skills/backend-data", items: [
    ["nodedotjs", "Node.js"], ["express", "Express"], ["fastapi", "FastAPI"], ["flask", "Flask"],
    ["django", "Django"], ["nestjs", "NestJS"], ["php", "PHP"], ["redis", "Redis"],
    ["postgresql", "PostgreSQL"], ["supabase", "Supabase"], ["mongodb", "MongoDB"], ["firebase", "Firebase"],
    ["neo4j", "Neo4j"], ["mysql", "MySQL"],
  ]},
  { id: "cloud", title: "~/skills/cloud-devops", items: [
    ["amazon-web-services", "AWS"], ["azure", "Azure"], ["vercel", "Vercel"], ["cloudflare", "Cloudflare"],
    ["docker", "Docker"], ["kubernetes", "Kubernetes"], ["github-actions", "GH Actions"], ["git", "Git"],
    ["github", "GitHub"], ["linux", "Linux"], ["playwright", "Playwright"], ["vitest", "Vitest"],
    ["postman", "Postman"],
  ]},
];

// Layout
const TILE = 64, ICON = 34, GAP_X = 18, LABEL_H = 24, ROW_GAP = 14, PER_ROW = 9, HEAD_H = 34, PAD = 4;
const CELL = TILE + GAP_X;
const WIDTH = PER_ROW * TILE + (PER_ROW - 1) * GAP_X + PAD * 2;

const luminance = (hex) => {
  const h = (hex || "000000").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Choose the variant that stays visible on this theme's tile.
function pickVariant(icon, theme) {
  const v = icon.variants || {};
  const L = luminance(icon.hex);
  if (theme === "dark" && L < 0.06) {
    if (v.light) return { svg: v.light };
    if (v.mono) return { svg: v.mono, tint: THEMES.dark.monoIcon };
  }
  if (theme === "light" && L > 0.85) {
    if (v.dark) return { svg: v.dark };
    if (v.mono) return { svg: v.mono, tint: THEMES.light.monoIcon };
  }
  return { svg: v.default || icon.svg };
}

// Icons are nested inside one document, so their internal ids must not collide.
function prefixIds(svg, p) {
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids) {
    const safe = `${p}-${id.replace(/[^A-Za-z0-9_-]/g, "_")}`;
    const e = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    svg = svg
      .replace(new RegExp(`id="${e}"`, "g"), `id="${safe}"`)
      .replace(new RegExp(`url\\(#${e}\\)`, "g"), `url(#${safe})`)
      .replace(new RegExp(`href="#${e}"`, "g"), `href="#${safe}"`);
  }
  return svg;
}

function nest(raw, x, y, size, tint, p) {
  let svg = prefixIds(raw.replace(/<\?xml[^>]*>/, "").trim(), p);
  const open = svg.match(/<svg\b[^>]*>/)[0];
  // Rebuild the root tag from scratch: keep only the viewBox and a root fill, drop
  // everything else so no attribute can end up duplicated.
  const get = (n) => (open.match(new RegExp(`\\s${n}="([^"]*)"`, "i")) || [])[1];
  const vb = get("viewBox") || `0 0 ${parseFloat(get("width")) || 24} ${parseFloat(get("height")) || 24}`;
  const rootFill = get("fill");
  const fill = tint ? ` fill="${tint}" color="${tint}" style="color:${tint}"` : rootFill ? ` fill="${rootFill}"` : "";
  const newOpen = `<svg viewBox="${vb}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"${fill}>`;
  return svg.replace(open, newOpen);
}

async function render(group, theme) {
  const T = THEMES[theme];
  const n = group.items.length;
  const rows = Math.ceil(n / PER_ROW);
  const height = HEAD_H + rows * (TILE + LABEL_H) + (rows - 1) * ROW_GAP + PAD;
  const parts = [];
  let i = 0;
  for (const [slug, label] of group.items) {
    const icon = (await import(`thesvg/${slug}`)).default;
    const { svg, tint } = pickVariant(icon, theme);
    const row = Math.floor(i / PER_ROW), col = i % PER_ROW;
    const inRow = Math.min(PER_ROW, n - row * PER_ROW);
    const rowW = inRow * TILE + (inRow - 1) * GAP_X;
    const x0 = (WIDTH - rowW) / 2 + col * CELL;
    const y0 = HEAD_H + row * (TILE + LABEL_H + ROW_GAP);
    const o = (TILE - ICON) / 2;
    parts.push(
      `<g class="t" style="animation-delay:${(i * 45).toFixed(0)}ms">` +
      `<rect x="${x0}" y="${y0}" width="${TILE}" height="${TILE}" rx="14" fill="${T.tile}" stroke="${T.stroke}"/>` +
      nest(svg, x0 + o, y0 + o, ICON, tint, `${group.id}${i}`) +
      `<text x="${x0 + TILE / 2}" y="${y0 + TILE + 16}" text-anchor="middle" class="l">${esc(label)}</text></g>`
    );
    i++;
  }
  const alt = group.items.map(([, l]) => l).join(", ");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${esc(alt)}">
<title>${esc(group.title)}: ${esc(alt)}</title>
<style>
.h{font:600 13px ${MONO};fill:${T.accent}}
.c{font:12px ${MONO};fill:${T.muted}}
.l{font:500 10.5px ${SANS};fill:${T.muted}}
.t{animation:rise .5s cubic-bezier(.2,.7,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
${MOTION_GUARD}
</style>
<text x="${PAD}" y="18" class="h">$ ls ${esc(group.title)}</text>
<text x="${WIDTH - PAD}" y="18" text-anchor="end" class="c">${n} items</text>
${parts.join("\n")}
</svg>`;
}

mkdirSync("assets/skills", { recursive: true });
for (const g of GROUPS) {
  for (const theme of ["dark", "light"]) {
    writeFileSync(`assets/skills/${g.id}-${theme}.svg`, await render(g, theme));
  }
  console.log(`skills: ${g.id} (${g.items.length} icons)`);
}

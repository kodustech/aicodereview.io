/**
 * Renders one Open Graph image per page into public/og/.
 *
 * SVG is written here and rasterised with rsvg-convert, so the images are
 * static files on the CDN rather than a serverless render on every share.
 * Re-run with `npm run og` after content changes; FONT_DIR must hold the two
 * site fonts (see README).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';

const OUT = 'public/og';
const FONTCONFIG = process.env.FONTCONFIG_FILE;
const BG = '#0c0a09';
const FG = '#fafaf9';
const MUTED = '#a8a29e';
const ACCENT = '#ef6820';
const LINE = '#292524';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Greedy wrap at an approximate character width for the given font size. */
function wrap(text, size, maxWidth) {
  const perChar = size * 0.54;
  const max = Math.floor(maxWidth / perChar);
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function meterCells(score) {
  const cells = [];
  let left = score;
  for (let i = 0; i < 9; i++) {
    if (left >= 1) { cells.push('full'); left -= 1; }
    else if (left >= 0.5) { cells.push('half'); left -= 0.5; }
    else cells.push('empty');
  }
  return cells;
}

function meterSvg(score, x, y, w = 26, h = 44, gap = 8) {
  return meterCells(score).map((c, i) => {
    const cx = x + i * (w + gap);
    if (c === 'full') return `<rect x="${cx}" y="${y}" width="${w}" height="${h}" fill="${ACCENT}"/>`;
    if (c === 'half') return `<rect x="${cx}" y="${y + h / 2}" width="${w}" height="${h / 2}" fill="${ACCENT}"/><rect x="${cx + 0.75}" y="${y + 0.75}" width="${w - 1.5}" height="${h - 1.5}" fill="none" stroke="${ACCENT}" stroke-width="1.5"/>`;
    return `<rect x="${cx + 0.75}" y="${y + 0.75}" width="${w - 1.5}" height="${h - 1.5}" fill="none" stroke="${LINE}" stroke-width="1.5"/>`;
  }).join('');
}

function card({ eyebrow, title, subtitle, score, footerRight }) {
  const titleSize = title.length > 46 ? 62 : title.length > 28 ? 76 : 92;
  const titleLines = wrap(title, titleSize, 1000).slice(0, 3);
  const allSub = subtitle ? wrap(subtitle, 30, 1000) : [];
  const subLines = allSub.slice(0, 2);
  if (allSub.length > 2 && subLines.length) subLines[1] = subLines[1].replace(/[,.;:]?$/, '…');
  const titleY = 236;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BG}"/>
  <rect x="0" y="0" width="1200" height="6" fill="${ACCENT}"/>
  <text x="80" y="120" font-family="JetBrains Mono" font-size="22" letter-spacing="3" fill="${MUTED}">${esc(eyebrow.toUpperCase())}</text>
  ${titleLines.map((l, i) => `<text x="80" y="${titleY + i * (titleSize + 8)}" font-family="Space Grotesk" font-weight="700" font-size="${titleSize}" fill="${FG}">${esc(l)}</text>`).join('\n  ')}
  ${subLines.map((l, i) => `<text x="80" y="${titleY + titleLines.length * (titleSize + 8) + 30 + i * 40}" font-family="Space Grotesk" font-size="30" fill="${MUTED}">${esc(l)}</text>`).join('\n  ')}
  ${score !== undefined ? `${meterSvg(score, 80, 452)}<text x="${80 + 9 * 34 + 14}" y="488" font-family="JetBrains Mono" font-weight="700" font-size="38" fill="${FG}">${score}<tspan fill="${MUTED}">/9</tspan></text>` : ''}
  <rect x="80" y="548" width="1040" height="1" fill="${LINE}"/>
  <text x="80" y="592" font-family="JetBrains Mono" font-weight="700" font-size="24" fill="${FG}">[ aicodereview<tspan fill="${ACCENT}">.io</tspan> ]</text>
  ${footerRight ? `<text x="1120" y="592" text-anchor="end" font-family="JetBrains Mono" font-size="22" fill="${MUTED}">${esc(footerRight)}</text>` : ''}
</svg>`;
}

function render(relPath, svg) {
  const svgPath = `/tmp/og-tmp.svg`;
  writeFileSync(svgPath, svg);
  const outPath = join(OUT, relPath);
  mkdirSync(dirname(outPath), { recursive: true });
  execFileSync('rsvg-convert', ['-w', '1200', '-h', '630', svgPath, '-o', outPath], {
    env: { ...process.env, ...(FONTCONFIG ? { FONTCONFIG_FILE: FONTCONFIG } : {}) },
  });
}

// --- data -------------------------------------------------------------------
const W = { yes: 1, partial: 0.5, no: 0, unknown: 0 };
const toolFiles = readdirSync('src/content/tools').filter((f) => f.endsWith('.json'));
const tools = toolFiles.map((f) => {
  const d = JSON.parse(readFileSync(join('src/content/tools', f), 'utf8'));
  return { slug: f.replace(/\.json$/, ''), ...d, score: Math.round(Object.values(d.standards).reduce((a, v) => a + W[v.status], 0) * 10) / 10 };
});
const byScore = [...tools].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

function frontmatter(path) {
  const raw = readFileSync(path, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('"')) { try { v = JSON.parse(v); } catch {} }
    out[kv[1]] = v;
  }
  return out;
}

rmSync(OUT, { recursive: true, force: true });
let n = 0;

// Home
render('default.png', card({
  eyebrow: `The AI code review directory · ${tools.length} tools`,
  title: 'Every AI code review tool, measured against one public standard.',
  subtitle: 'Pricing, licence, self-hosting and model control — each with a source and a date.',
  footerRight: '9 standards',
})); n++;

// Tools
for (const t of tools) {
  const rank = byScore.findIndex((x) => x.score === t.score) + 1;
  const tied = byScore.filter((x) => x.score === t.score).length > 1;
  render(`tools/${t.slug}.png`, card({
    eyebrow: `Tool profile · ${tied ? '=' : '#'}${rank} of ${tools.length}`,
    title: t.name,
    subtitle: t.tagline,
    score: t.score,
    footerRight: `Verified ${t.lastVerified}`,
  })); n++;
}

// Comparisons
const ANCHORS = ['coderabbit', 'kodus', 'greptile', 'qodo', 'cursor-bugbot', 'github-copilot-code-review'];
const BROAD = ['coderabbit', 'kodus'];
const posts = readdirSync('src/content/blog').filter((f) => /\.mdx?$/.test(f)).map((f) => f.replace(/\.mdx?$/, ''));
const pairs = new Set();
const byId = new Map(tools.map((t) => [t.slug, t]));
const addPair = (a, b) => { if (a !== b && byId.has(a) && byId.has(b)) pairs.add([a, b].sort().join('-vs-')); };
for (const a of ANCHORS) for (const b of ANCHORS) addPair(a, b);
for (const a of BROAD) for (const t of tools) if (t.category === 'ai-pr-review') addPair(a, t.slug);
for (const slug of [...pairs].filter((s) => !posts.includes(s))) {
  const [a, b] = slug.split('-vs-').map((id) => byId.get(id));
  render(`compare/${slug}.png`, card({
    eyebrow: 'Head to head',
    title: `${a.name} vs ${b.name}`,
    subtitle: `${a.name} ${a.score}/9 · ${b.name} ${b.score}/9 — licence, hosting and all 9 standards, side by side.`,
    footerRight: 'Sourced comparison',
  })); n++;
}

// Guides, glossary, blog, platforms
for (const f of readdirSync('src/content/learn')) {
  const d = frontmatter(join('src/content/learn', f));
  render(`learn/${f.replace(/\.mdx?$/, '')}.png`, card({
    eyebrow: 'Guide', title: d.title ?? '', subtitle: d.description ?? '', footerRight: 'aicodereview.io/learn',
  })); n++;
}
for (const f of readdirSync('src/content/glossary')) {
  const d = frontmatter(join('src/content/glossary', f));
  render(`glossary/${f.replace(/\.mdx?$/, '')}.png`, card({
    eyebrow: 'Glossary', title: d.term ?? '', subtitle: d.definition ?? '', footerRight: 'aicodereview.io/glossary',
  })); n++;
}
for (const f of readdirSync('src/content/blog')) {
  const d = frontmatter(join('src/content/blog', f));
  render(`blog/${f.replace(/\.mdx?$/, '')}.png`, card({
    eyebrow: d.category ?? 'Blog', title: d.title ?? '', subtitle: d.description ?? '', footerRight: 'aicodereview.io/blog',
  })); n++;
}
for (const p of [...new Set(tools.flatMap((t) => t.platforms))]) {
  const list = byScore.filter((t) => t.platforms.includes(p));
  render(`platform/${p}.png`, card({
    eyebrow: 'By platform',
    title: `AI code review tools for ${p.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
    subtitle: `${list.length} tools document support, scored against the same 9 standards.`,
    footerRight: `${list.length} tools`,
  })); n++;
}

console.log(`generated ${n} OG images into ${OUT}`);

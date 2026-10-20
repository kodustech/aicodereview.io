/**
 * Computes an accurate <lastmod> for every URL the sitemap integration emits.
 *
 * - /blog/<slug>/   -> the post's updatedDate (fallback pubDate) frontmatter.
 * - /tools/<slug>/  -> the tool's lastVerified field.
 * - everything else -> the last git-committed date of the file that renders
 *   it: the content file for a per-item page backed by one (glossary terms,
 *   learn guides, standards/pillars), otherwise the shared page template.
 *
 * Runs once at config-eval time, before any page is built, so it reads
 * frontmatter straight off disk rather than through astro:content (which
 * isn't available this early).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function frontmatterField(raw, field) {
  const match = raw.match(new RegExp(`^${field}:\\s*["']?([^"'\\n]+?)["']?\\s*$`, 'm'));
  return match ? match[1].trim() : undefined;
}

function contentDates(dir, { idField = null } = {}) {
  const map = new Map();
  const base = path.join(ROOT, dir);
  if (!existsSync(base)) return map;
  for (const file of readdirSync(base)) {
    if (!/\.(md|mdx|json)$/.test(file)) continue;
    const slug = file.replace(/\.(md|mdx|json)$/, '');
    const raw = readFileSync(path.join(base, file), 'utf-8');
    if (file.endsWith('.json')) {
      const data = JSON.parse(raw);
      map.set(slug, idField ? data[idField] : undefined);
    } else {
      const updated = frontmatterField(raw, 'updatedDate') ?? frontmatterField(raw, 'updated');
      const published = frontmatterField(raw, 'pubDate');
      map.set(slug, updated ?? published);
    }
  }
  return map;
}

const blogDates = contentDates('src/content/blog');
const toolDates = contentDates('src/content/tools', { idField: 'lastVerified' });

const gitDateCache = new Map();

/** Last commit date touching `relPath`, falling back to its mtime if it's unversioned. */
function gitDate(relPath) {
  if (gitDateCache.has(relPath)) return gitDateCache.get(relPath);
  let iso;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', relPath], { cwd: ROOT, encoding: 'utf-8' }).trim();
    iso = out || undefined;
  } catch {
    iso = undefined;
  }
  if (!iso) {
    const abs = path.join(ROOT, relPath);
    if (existsSync(abs)) iso = statSync(abs).mtime.toISOString();
  }
  gitDateCache.set(relPath, iso);
  return iso;
}

/** Ordered [pattern, handler] pairs; first match wins. */
const ROUTES = [
  [/^\/blog\/category\/[^/]+\/$/, () => gitDate('src/pages/blog/category/[category].astro')],
  [/^\/blog\/tag\/[^/]+\/$/, () => gitDate('src/pages/blog/tag/[tag].astro')],
  [/^\/blog\/$/, () => gitDate('src/pages/blog/index.astro')],
  [/^\/blog\/([^/]+)\/$/, (m) => blogDates.get(m[1]) ?? gitDate('src/pages/blog/[slug].astro')],

  [/^\/tools\/category\/[^/]+\/$/, () => gitDate('src/pages/tools/category/[category].astro')],
  [/^\/tools\/platform\/[^/]+\/$/, () => gitDate('src/pages/tools/platform/[platform].astro')],
  [/^\/tools\/open-source\/$/, () => gitDate('src/pages/tools/open-source.astro')],
  [/^\/tools\/self-hosted\/$/, () => gitDate('src/pages/tools/self-hosted.astro')],
  [/^\/tools\/([^/]+)\/$/, (m) => toolDates.get(m[1]) ?? gitDate('src/pages/tools/[slug].astro')],

  [/^\/compare\/$/, () => gitDate('src/pages/compare/index.astro')],
  [/^\/compare\/[^/]+\/$/, () => gitDate('src/pages/compare/[pair].astro')],

  [/^\/glossary\/$/, () => gitDate('src/pages/glossary/index.astro')],
  [/^\/glossary\/([^/]+)\/$/, (m) => gitDate(`src/content/glossary/${m[1]}.mdx`)],

  [/^\/learn\/$/, () => gitDate('src/pages/learn/index.astro')],
  [/^\/learn\/([^/]+)\/$/, (m) => gitDate(`src/content/learn/${m[1]}.mdx`)],

  [/^\/standards\/$/, () => gitDate('src/pages/standards/index.astro')],
  [/^\/standards\/([^/]+)\/$/, (m) => gitDate(`src/content/pillars/${m[1]}.mdx`)],

  [/^\/$/, () => gitDate('src/pages/index.astro')],
  [/^\/about\/$/, () => gitDate('src/pages/about.astro')],
  [/^\/methodology\/$/, () => gitDate('src/pages/methodology.astro')],
  [/^\/assessment\/$/, () => gitDate('src/pages/assessment.astro')],
];

export function sitemapSerialize(item) {
  const pathname = new URL(item.url).pathname;
  for (const [pattern, resolve] of ROUTES) {
    const m = pathname.match(pattern);
    if (m) {
      const lastmod = resolve(m);
      if (lastmod) return { ...item, lastmod };
      break;
    }
  }
  console.warn(`[sitemap] no lastmod source matched ${pathname}`);
  return item;
}

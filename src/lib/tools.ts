import { getCollection, type CollectionEntry } from 'astro:content';
import { compareByScore, scoreTool, statusOf, noteOf, PILLAR_IDS, PILLAR_SHORT, PILLAR_PROSE, type ToolScore } from './score';

export type Tool = CollectionEntry<'tools'>;

export { scoreTool, statusOf, noteOf, PILLAR_IDS, PILLAR_SHORT, PILLAR_PROSE };
export type { ToolScore };

export const TOOL_CATEGORY_LABELS: Record<string, string> = {
  'ai-pr-review': 'AI PR Review',
  'code-quality': 'Code Quality',
  'static-analysis': 'Static Analysis',
  'security': 'Security',
  'ide-assistant': 'IDE Assistant',
};

/** One-line intent copy per category — used on category pages and filter chips. */
export const TOOL_CATEGORY_BLURBS: Record<string, string> = {
  'ai-pr-review': 'Tools whose main job is reviewing a pull request and leaving findings on the diff.',
  'code-quality': 'Platforms that track maintainability, duplication, and coverage across a whole codebase over time.',
  'static-analysis': 'Rule- and pattern-based analyzers that run without an LLM in the loop.',
  'security': 'Scanners built around vulnerability classes, dependencies, and secrets rather than general review.',
  'ide-assistant': 'Assistants that review while you write, before a pull request exists.',
};

export const SELF_HOSTED_LABELS: Record<string, string> = {
  'full': 'Yes — full stack',
  'enterprise-only': 'Enterprise only',
  'byok': 'BYOK (your API keys)',
  'none': 'No',
  'unknown': 'Unknown',
};

export const SELF_HOSTED_SHORT: Record<string, string> = {
  'full': 'Self-hostable',
  'enterprise-only': 'Enterprise only',
  'byok': 'BYOK',
  'none': 'Cloud only',
  'unknown': 'Unknown',
};

/** Reads correctly inside a sentence, unlike the table label. */
export const SELF_HOSTED_PROSE: Record<string, string> = {
  'full': 'fully self-hostable on a standard plan',
  'enterprise-only': 'self-hostable only on an enterprise contract',
  'byok': 'hosted, but running against your own model keys',
  'none': 'cloud-only',
  'unknown': 'undocumented on self-hosting',
};

export const FREE_TIER_LABELS: Record<string, string> = {
  'yes': 'Free tier',
  'limited': 'Limited free tier',
  'trial': 'Trial only',
  'no': 'No free tier',
  'unknown': 'Unknown',
};

export const STATUS_GLYPHS: Record<string, string> = {
  yes: '✓',
  partial: '~',
  no: '✗',
  unknown: '?',
};

export const STATUS_LABELS: Record<string, string> = {
  yes: 'Documented',
  partial: 'Partial',
  no: 'Not offered',
  unknown: 'Unknown',
};

export const PLATFORM_LABELS: Record<string, string> = {
  'github': 'GitHub',
  'gitlab': 'GitLab',
  'bitbucket': 'Bitbucket',
  'azure-devops': 'Azure DevOps',
  'forgejo': 'Forgejo',
  'gitea': 'Gitea',
  'vs-code': 'VS Code',
  'jetbrains': 'JetBrains',
  'cli': 'CLI',
};

export function platformLabel(id: string): string {
  return PLATFORM_LABELS[id] ?? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** The sponsor's slug — its rows/pages carry an explicit sponsor label. */
export const SPONSOR_SLUG = 'kodus';

/** Alphabetical, sponsor pinned first. Kept for pages that list rather than rank. */
export async function getTools(): Promise<Tool[]> {
  const tools = await getCollection('tools');
  return tools.sort((a, b) => {
    if (a.id === SPONSOR_SLUG) return -1;
    if (b.id === SPONSOR_SLUG) return 1;
    return a.data.name.localeCompare(b.data.name);
  });
}

/** Directory order: coverage score first. The sponsor gets no lift here. */
export async function getRankedTools(): Promise<Tool[]> {
  const tools = await getCollection('tools');
  return tools.sort(compareByScore);
}

export function toolUrl(tool: Tool): string {
  return `/tools/${tool.id}/`;
}

/** Deterministic monogram tile: the directory has no licensed vendor logos. */
export function monogram(name: string): string {
  const words = name.split(/[\s-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Stable hue per tool so tiles are distinguishable but never random between builds. */
export function monogramHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 360;
  return hash;
}

/** Cheapest paid entry point when the vendor publishes one, else a coarse label. */
export function priceLabel(tool: Tool): string {
  if (tool.data.startingPrice) return tool.data.startingPrice;
  if (/^free\b/i.test(tool.data.pricing)) return 'Free';
  return 'See pricing';
}

export interface DerivedProsCons {
  pros: Array<{ pillar: string; note: string }>;
  cons: Array<{ pillar: string; note: string }>;
}

/**
 * Pros/cons are not editorial opinion — they are the `yes` and `no` rows of the
 * same matrix, restated. Nothing here can contradict the table above it.
 */
export function prosAndCons(tool: Tool, pillarTitles: Record<string, string>): DerivedProsCons {
  const pros: DerivedProsCons['pros'] = [];
  const cons: DerivedProsCons['cons'] = [];

  for (const id of PILLAR_IDS) {
    const status = statusOf(tool, id);
    const note = noteOf(tool, id);
    const pillar = pillarTitles[id] ?? PILLAR_SHORT[id] ?? id;
    if (status === 'yes') pros.push({ pillar, note });
    if (status === 'no') cons.push({ pillar, note: note || 'Not offered.' });
  }

  return { pros, cons };
}

/** "Best for" line, derived from the verified facts rather than written per tool. */
export function bestFor(tool: Tool): string {
  const bits: string[] = [];
  const s = scoreTool(tool);

  if (tool.data.selfHosted === 'full') bits.push('teams that need the reviewer inside their own infrastructure');
  else if (tool.data.selfHosted === 'enterprise-only') bits.push('larger orgs willing to buy an enterprise plan for self-hosting');

  if (tool.data.openSource) bits.push('teams that want to read and fork the source');
  if (s.strengths.includes('07-economic-transparency')) bits.push('teams that want model choice and visible token costs');
  if (s.strengths.includes('04-business-logic')) bits.push('teams reviewing against tickets, not just diffs');
  if (s.strengths.includes('06-sandbox-validation')) bits.push('teams that want findings validated before they land on the PR');

  if (bits.length === 0) {
    bits.push(`teams already standardised on ${tool.data.platforms.map(platformLabel).slice(0, 2).join(' and ') || 'a hosted workflow'}`);
  }

  return bits.slice(0, 3).join(', ');
}

/** Same-category neighbours, closest score first — the "alternatives" block. */
export function similarTools(tool: Tool, all: Tool[], limit = 4): Tool[] {
  const target = scoreTool(tool).score;
  return all
    .filter((t) => t.id !== tool.id)
    .map((t) => ({
      t,
      d: (t.data.category === tool.data.category ? 0 : 100) + Math.abs(scoreTool(t).score - target),
    }))
    .sort((a, b) => a.d - b.d || a.t.data.name.localeCompare(b.t.data.name))
    .slice(0, limit)
    .map(({ t }) => t);
}

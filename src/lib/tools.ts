import { getCollection, type CollectionEntry } from 'astro:content';

export type Tool = CollectionEntry<'tools'>;

export const TOOL_CATEGORY_LABELS: Record<string, string> = {
  'ai-pr-review': 'AI PR Review',
  'code-quality': 'Code Quality',
  'static-analysis': 'Static Analysis',
  'security': 'Security',
  'ide-assistant': 'IDE Assistant',
};

export const SELF_HOSTED_LABELS: Record<string, string> = {
  'full': 'Yes — full stack',
  'enterprise-only': 'Enterprise only',
  'byok': 'BYOK (your API keys)',
  'none': 'No',
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

/** The sponsor's slug — its rows/pages carry an explicit sponsor label. */
export const SPONSOR_SLUG = 'kodus';

export async function getTools(): Promise<Tool[]> {
  const tools = await getCollection('tools');
  // Sponsor pinned first within its category, everyone else alphabetical.
  return tools.sort((a, b) => {
    if (a.id === SPONSOR_SLUG) return -1;
    if (b.id === SPONSOR_SLUG) return 1;
    return a.data.name.localeCompare(b.data.name);
  });
}

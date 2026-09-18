import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { getRankedTools, scoreTool, statusOf, noteOf, TOOL_CATEGORY_LABELS, SELF_HOSTED_LABELS, FREE_TIER_LABELS, platformLabel } from '../../lib/tools';
import { SITE_URL } from '../../lib/blog';

// Raw markdown mirror of each tool profile, for AI crawlers and agents (GEO).
export async function getStaticPaths() {
  const tools = await getRankedTools();
  return tools.map((tool, i) => ({ params: { slug: tool.id }, props: { tool, rank: i + 1, total: tools.length } }));
}

export async function GET({ props }: APIContext) {
  const { tool, rank, total } = props as any;
  const pillars = (await getCollection('pillars')).sort((a, b) => a.data.order - b.data.order);
  const s = scoreTool(tool);
  const d = tool.data;

  const body = [
    `# ${d.name}`,
    '',
    `> ${d.tagline}`,
    '',
    `- Coverage score: ${s.score}/9 (rank ${rank} of ${total} in the aicodereview.io directory)`,
    `- Category: ${TOOL_CATEGORY_LABELS[d.category]}`,
    `- Website: ${d.website}`,
    `- Licence: ${d.openSource ? `open source, ${d.license}` : 'proprietary'}`,
    `- Pricing: ${d.pricing}`,
    `- Free tier: ${FREE_TIER_LABELS[d.freeTier]}`,
    `- Self-hosting: ${SELF_HOSTED_LABELS[d.selfHosted]}${d.selfHostedNote ? ` — ${d.selfHostedNote}` : ''}`,
    `- Model control: ${d.modelControl}`,
    `- Platforms: ${d.platforms.map(platformLabel).join(', ') || 'not documented'}`,
    `- Last verified: ${d.lastVerified}`,
    `- Canonical: ${SITE_URL}/tools/${tool.id}/`,
    '',
    '---',
    '',
    '## Against the 9 standards',
    '',
    'Scoring: documented = 1 point, partial = 0.5, not offered = 0, undocumented = 0.',
    '',
    ...pillars.map((p) => `### ${p.data.title}\n\nStatus: ${statusOf(tool, p.id)}\n\n${noteOf(tool, p.id) || 'No public documentation either way.'}`),
    '',
    '---',
    '',
    `Source: aicodereview.io. Scoring formula and sources: ${SITE_URL}/methodology/`,
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}

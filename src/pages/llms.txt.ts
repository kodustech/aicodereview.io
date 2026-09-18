import { getCollection } from 'astro:content';
import { getPublishedPosts, SITE_URL, CATEGORY_LABELS } from '../lib/blog';
import { getRankedTools, scoreTool, TOOL_CATEGORY_LABELS, SELF_HOSTED_PROSE } from '../lib/tools';
import { buildPairs } from '../lib/compare';

// llms.txt — index of the site for LLMs/AI agents (https://llmstxt.org)
export async function GET() {
  const pillars = (await getCollection('pillars')).sort((a, b) => a.data.order - b.data.order);
  const posts = await getPublishedPosts();
  const tools = await getRankedTools();
  const terms = (await getCollection('glossary')).sort((a, b) => a.data.term.localeCompare(b.data.term));
  const guides = (await getCollection('learn')).sort((a, b) => a.data.order - b.data.order);
  const pairs = buildPairs(tools, new Set(posts.map((p) => p.id)));
  const lastVerified = tools.map((t) => t.data.lastVerified).sort().at(-1);

  const byCategory = new Map<string, typeof posts>();
  for (const post of posts) {
    byCategory.set(post.data.category, [...(byCategory.get(post.data.category) ?? []), post]);
  }

  const lines: string[] = [
    '# aicodereview.io',
    '',
    `> An independent directory and standard for AI code review tools. ${tools.length} tools are scored against 9 public engineering standards, with a source link and a verification date on every claim (last refresh ${lastVerified}). Includes head-to-head comparisons, a ${terms.length}-term glossary, long-form guides, and an engineer-written blog. Funded by Kodus (https://kodus.io), who build one of the listed tools and are scored by the same rubric; full disclosure and formula at ${SITE_URL}/methodology/.`,
    '',
    'Scoring: each tool is rated on 9 standards as documented (1 point), partial (0.5), not offered (0) or undocumented (0). The total is the coverage score out of 9. It measures documented capability, not measured review quality.',
    '',
    'Every blog post is available as raw markdown by appending `.md` to its URL; the same applies to tool profiles and glossary terms. The full site content is in /llms-full.txt.',
    '',
    '## Directory — tools ranked by documented coverage',
    '',
    ...tools.map((tool) => {
      const s = scoreTool(tool);
      return `- [${tool.data.name}](${SITE_URL}/tools/${tool.id}/) — ${s.score}/9 · ${TOOL_CATEGORY_LABELS[tool.data.category]} · ${tool.data.openSource ? `open source (${tool.data.license})` : 'proprietary'} · ${SELF_HOSTED_PROSE[tool.data.selfHosted]} · ${tool.data.tagline}`;
    }),
    '',
    '## The 9 standards',
    '',
    ...pillars.map((p) => `- [${p.data.title}](${SITE_URL}/standards/${p.id}/): ${p.data.description}`),
    '',
    '## Head-to-head comparisons',
    '',
    ...pairs.map((pair) => `- [${pair.a.data.name} vs ${pair.b.data.name}](${SITE_URL}/compare/${pair.slug}/)`),
    '',
    '## Guides',
    '',
    ...guides.map((g) => `- [${g.data.title}](${SITE_URL}/learn/${g.id}/): ${g.data.description}`),
    '',
    '## Filtered views',
    '',
    `- [Self-hosted AI code review tools](${SITE_URL}/tools/self-hosted/)`,
    `- [Open-source AI code review tools](${SITE_URL}/tools/open-source/)`,
    ...[...new Set(tools.map((t) => t.data.category))].map(
      (cat) => `- [${TOOL_CATEGORY_LABELS[cat]} tools](${SITE_URL}/tools/category/${cat}/)`
    ),
    `- [Readiness assessment](${SITE_URL}/assessment/): score your own setup against the 9 standards.`,
    `- [Methodology and funding](${SITE_URL}/methodology/)`,
  ];

  for (const [category, list] of byCategory) {
    lines.push('', `## Blog — ${CATEGORY_LABELS[category] ?? category}`, '');
    for (const post of list) {
      lines.push(`- [${post.data.title}](${SITE_URL}/blog/${post.id}/): ${post.data.description}`);
    }
  }

  lines.push('', '## Glossary', '');
  for (const term of terms) {
    lines.push(`- [${term.data.term}](${SITE_URL}/glossary/${term.id}/): ${term.data.definition}`);
  }

  lines.push('');
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

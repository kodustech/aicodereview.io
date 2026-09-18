import { getCollection } from 'astro:content';
import { getPublishedPosts, SITE_URL } from '../lib/blog';
import { getRankedTools, scoreTool, statusOf, noteOf, TOOL_CATEGORY_LABELS, SELF_HOSTED_LABELS, FREE_TIER_LABELS, platformLabel } from '../lib/tools';

// llms-full.txt — full site content as one markdown document for LLM ingestion.
export async function GET() {
  const pillars = (await getCollection('pillars')).sort((a, b) => a.data.order - b.data.order);
  const posts = await getPublishedPosts();
  const tools = await getRankedTools();
  const terms = (await getCollection('glossary')).sort((a, b) => a.data.term.localeCompare(b.data.term));
  const guides = (await getCollection('learn')).sort((a, b) => a.data.order - b.data.order);

  const sections: string[] = [
    '# aicodereview.io — full content',
    '',
    `> An independent directory and standard for AI code review tools: ${tools.length} tools scored against 9 public standards, with sources and verification dates. Funded by Kodus (https://kodus.io), who build one of the listed tools and are scored by the same rubric. Methodology: ${SITE_URL}/methodology/.`,
    '',
    'Scoring: documented = 1, partial = 0.5, not offered = 0, undocumented = 0, summed over 9 standards.',
    '',
  ];

  sections.push('---', '', '# Part 1: The 9 standards', '');
  for (const pillar of pillars) {
    sections.push(`<!-- source: ${SITE_URL}/standards/${pillar.id}/ -->`, '', pillar.body ?? '', '');
  }

  sections.push('---', '', '# Part 2: Tool directory', '');
  for (const tool of tools) {
    const s = scoreTool(tool);
    sections.push(
      `<!-- source: ${SITE_URL}/tools/${tool.id}/ -->`,
      '',
      `## ${tool.data.name} — ${s.score}/9`,
      '',
      `> ${tool.data.tagline}`,
      '',
      `- Category: ${TOOL_CATEGORY_LABELS[tool.data.category]}`,
      `- Website: ${tool.data.website}`,
      `- Licence: ${tool.data.openSource ? `open source, ${tool.data.license}` : 'proprietary'}`,
      `- Pricing: ${tool.data.pricing}`,
      `- Free tier: ${FREE_TIER_LABELS[tool.data.freeTier]}`,
      `- Self-hosting: ${SELF_HOSTED_LABELS[tool.data.selfHosted]}${tool.data.selfHostedNote ? ` — ${tool.data.selfHostedNote}` : ''}`,
      `- Model control: ${tool.data.modelControl}`,
      `- Platforms: ${tool.data.platforms.map(platformLabel).join(', ') || 'not documented'}`,
      `- Last verified: ${tool.data.lastVerified}`,
      '',
      'Against the 9 standards:',
      '',
      ...pillars.map((p) => `- ${p.data.title}: ${statusOf(tool, p.id)} — ${noteOf(tool, p.id) || 'no public documentation either way'}`),
      '',
    );
  }

  sections.push('---', '', '# Part 3: Guides', '');
  for (const guide of guides) {
    sections.push(
      `<!-- source: ${SITE_URL}/learn/${guide.id}/ -->`,
      '',
      `# ${guide.data.title}`,
      '',
      `> ${guide.data.description}`,
      '',
      guide.body ?? '',
      '',
    );
    if (guide.data.faq.length) {
      sections.push('## FAQ', '');
      for (const f of guide.data.faq) sections.push(`### ${f.q}`, '', f.a, '');
    }
  }

  sections.push('---', '', '# Part 4: Blog', '');
  for (const post of posts) {
    sections.push(
      `<!-- source: ${SITE_URL}/blog/${post.id}/ -->`,
      '',
      `# ${post.data.title}`,
      '',
      `> ${post.data.description}`,
      '',
      post.body ?? '',
      '',
    );
    if (post.data.faq.length) {
      sections.push('## FAQ', '');
      for (const f of post.data.faq) sections.push(`### ${f.q}`, '', f.a, '');
    }
  }

  sections.push('---', '', '# Part 5: Glossary', '');
  for (const term of terms) {
    sections.push(
      `<!-- source: ${SITE_URL}/glossary/${term.id}/ -->`,
      '',
      `# ${term.data.term}`,
      '',
      `> ${term.data.definition}`,
      '',
      term.body ?? '',
      '',
    );
  }

  return new Response(sections.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

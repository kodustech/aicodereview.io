import { getCollection } from 'astro:content';
import { getPublishedPosts, SITE_URL, CATEGORY_LABELS } from '../lib/blog';
import { getTools } from '../lib/tools';

// llms.txt — index of the site for LLMs/AI agents (https://llmstxt.org)
export async function GET() {
  const pillars = (await getCollection('pillars')).sort((a, b) => a.data.order - b.data.order);
  const posts = await getPublishedPosts();

  const byCategory = new Map<string, typeof posts>();
  for (const post of posts) {
    const list = byCategory.get(post.data.category) ?? [];
    list.push(post);
    byCategory.set(post.data.category, list);
  }

  const lines: string[] = [
    '# aicodereview.io',
    '',
    '> The 2026 engineering standard for evaluating AI Code Review tools: 9 pillars every AI code reviewer must meet, a self-assessment, a tools directory, and an engineer-written blog comparing the tools in the market. Sponsored by Kodus (https://kodus.io); methodology and sponsorship details at https://aicodereview.io/about/.',
    '',
    'Every blog post is also available as raw markdown by appending `.md` to its URL, and the full content of the site is in /llms-full.txt.',
    '',
    '## The 9 Standards',
    '',
    ...pillars.map((p) => `- [${p.data.title}](${SITE_URL}/standards/${p.id}/): ${p.data.description}`),
    '',
    '## Assessment',
    '',
    `- [AI Code Review Readiness Assessment](${SITE_URL}/assessment/): Score your current code review setup against the 9 standards.`,
  ];

  const tools = await getTools();
  if (tools.length > 0) {
    lines.push('', '## Tools Directory', '');
    for (const tool of tools) {
      lines.push(`- [${tool.data.name}](${SITE_URL}/tools/${tool.id}/): ${tool.data.tagline}`);
    }
  }

  for (const [category, list] of byCategory) {
    lines.push('', `## Blog — ${CATEGORY_LABELS[category] ?? category}`, '');
    for (const post of list) {
      lines.push(`- [${post.data.title}](${SITE_URL}/blog/${post.id}/): ${post.data.description}`);
    }
  }

  lines.push('');
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

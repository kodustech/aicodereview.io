import { getCollection } from 'astro:content';
import { getPublishedPosts, SITE_URL } from '../lib/blog';

// llms-full.txt — full site content as one markdown document for LLM ingestion.
export async function GET() {
  const pillars = (await getCollection('pillars')).sort((a, b) => a.data.order - b.data.order);
  const posts = await getPublishedPosts();

  const sections: string[] = [
    '# aicodereview.io — full content',
    '',
    '> The 2026 engineering standard for evaluating AI Code Review tools. Sponsored by Kodus (https://kodus.io); methodology at https://aicodereview.io/about/.',
    '',
  ];

  sections.push('---', '', '# Part 1: The 9 Standards', '');
  for (const pillar of pillars) {
    sections.push(`<!-- source: ${SITE_URL}/standards/${pillar.id}/ -->`, '', pillar.body ?? '', '');
  }

  sections.push('---', '', '# Part 2: Blog', '');
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
      for (const f of post.data.faq) {
        sections.push(`### ${f.q}`, '', f.a, '');
      }
    }
  }

  return new Response(sections.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

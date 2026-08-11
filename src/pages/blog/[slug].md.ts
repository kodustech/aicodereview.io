import type { APIContext } from 'astro';
import { getPublishedPosts, SITE_URL } from '../../lib/blog';

// Raw markdown version of each post, for AI crawlers and agents (GEO).
export async function getStaticPaths() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export async function GET({ props }: APIContext) {
  const { post } = props;
  const header = [
    `# ${post.data.title}`,
    '',
    `> ${post.data.description}`,
    '',
    `- Published: ${post.data.pubDate.toISOString().slice(0, 10)}`,
    `- Canonical: ${SITE_URL}/blog/${post.id}/`,
    `- Author: ${post.data.author}`,
    '',
    '---',
    '',
  ].join('\n');

  const faq = post.data.faq.length
    ? '\n\n## FAQ\n\n' + post.data.faq.map((f: { q: string; a: string }) => `### ${f.q}\n\n${f.a}`).join('\n\n')
    : '';

  return new Response(header + (post.body ?? '') + faq, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

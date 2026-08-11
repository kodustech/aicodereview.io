import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublishedPosts } from '../lib/blog';

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  return rss({
    title: 'aicodereview.io — AI Code Review Blog',
    description: 'Comparisons, alternatives, and evaluation guides for AI code review tools, benchmarked against the 2026 AI Code Review Standard.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: '<language>en-us</language>',
  });
}

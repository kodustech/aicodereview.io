import { getCollection, type CollectionEntry } from 'astro:content';

export const SITE_URL = 'https://aicodereview.io';

export const CATEGORY_LABELS: Record<string, string> = {
  'best-of': 'Best Of',
  'alternatives': 'Alternatives',
  'comparison': 'Comparisons',
  'guide': 'Guides',
  'explainer': 'Explainers',
  'review': 'Reviews',
};

export type BlogPost = CollectionEntry<'blog'>;

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function readingTime(body: string | undefined): number {
  const words = (body ?? '').trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export function postUrl(post: BlogPost): string {
  return `${SITE_URL}/blog/${post.id}/`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** Related posts: same category first, then shared tags, newest first. */
export function relatedPosts(post: BlogPost, all: BlogPost[], limit = 3): BlogPost[] {
  const others = all.filter((p) => p.id !== post.id);
  const score = (p: BlogPost) => {
    let s = 0;
    if (p.data.category === post.data.category) s += 2;
    s += p.data.tags.filter((t) => post.data.tags.includes(t)).length;
    return s;
  };
  return others
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || b.p.data.pubDate.valueOf() - a.p.data.pubDate.valueOf())
    .slice(0, limit)
    .map(({ p }) => p);
}

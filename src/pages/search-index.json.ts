import { getCollection } from 'astro:content';
import { getPublishedPosts, CATEGORY_LABELS, SITE_URL } from '../lib/blog';
import { getRankedTools, scoreTool, TOOL_CATEGORY_LABELS, platformLabel } from '../lib/tools';
import { buildPairs } from '../lib/compare';

interface Row {
  type: 'tool' | 'post' | 'term' | 'guide' | 'compare' | 'page';
  title: string;
  description: string;
  url: string;
  keywords?: string;
}

/** Feeds the ⌘K overlay. Static JSON so it is cached on the CDN like any page. */
export async function GET() {
  const tools = await getRankedTools();
  const posts = await getPublishedPosts();
  const terms = await getCollection('glossary');
  const guides = await getCollection('learn');
  const pillars = (await getCollection('pillars')).sort((a, b) => a.data.order - b.data.order);
  const pairs = buildPairs(tools, new Set(posts.map((p) => p.id)));

  const rows: Row[] = [
    ...tools.map((tool): Row => ({
      type: 'tool',
      title: tool.data.name,
      description: tool.data.tagline,
      url: `/tools/${tool.id}/`,
      keywords: [TOOL_CATEGORY_LABELS[tool.data.category], tool.data.license, ...tool.data.platforms.map(platformLabel)].join(' '),
    })),
    ...pairs.map((pair): Row => ({
      type: 'compare',
      title: `${pair.a.data.name} vs ${pair.b.data.name}`,
      description: `${pair.a.data.name} ${scoreTool(pair.a).score}/9 against ${pair.b.data.name} ${scoreTool(pair.b).score}/9, fact by fact.`,
      url: `/compare/${pair.slug}/`,
      keywords: `${pair.a.data.name} ${pair.b.data.name} comparison alternative versus`,
    })),
    ...posts.map((post): Row => ({
      type: 'post',
      title: post.data.title,
      description: post.data.description,
      url: `/blog/${post.id}/`,
      keywords: [CATEGORY_LABELS[post.data.category], ...post.data.tags].join(' '),
    })),
    ...terms.map((term): Row => ({
      type: 'term',
      title: term.data.term,
      description: term.data.definition,
      url: `/glossary/${term.id}/`,
      keywords: term.data.aliases.join(' '),
    })),
    ...guides.map((guide): Row => ({
      type: 'guide',
      title: guide.data.title,
      description: guide.data.description,
      url: `/learn/${guide.id}/`,
    })),
    ...pillars.map((pillar): Row => ({
      type: 'page',
      title: pillar.data.title,
      description: pillar.data.description,
      url: `/standards/${pillar.id}/`,
      keywords: 'standard pillar baseline',
    })),
    { type: 'page', title: 'The directory', description: `All ${tools.length} AI code review tools, scored and filterable.`, url: '/#directory' },
    { type: 'page', title: 'Self-hosted tools', description: 'Reviewers that run inside your own infrastructure.', url: '/tools/self-hosted/' },
    { type: 'page', title: 'Open-source tools', description: 'Reviewers whose source you can read and fork.', url: '/tools/open-source/' },
    { type: 'page', title: 'Methodology & scoring', description: 'The exact rubric behind every score, and how this site is funded.', url: '/methodology/' },
    { type: 'page', title: 'Readiness assessment', description: 'Score your own code review setup against the 9 standards.', url: '/assessment/' },
    { type: 'page', title: 'About this site', description: 'What this is, who funds it, and how the facts are checked.', url: '/about/' },
  ];

  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

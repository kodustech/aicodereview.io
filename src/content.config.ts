import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pillarsCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pillars" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
  }),
});

export const BLOG_CATEGORIES = ['best-of', 'alternatives', 'comparison', 'guide', 'explainer', 'review'] as const;

const blogCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(BLOG_CATEGORIES),
    tags: z.array(z.string()).default([]),
    author: z.string().default('aicodereview.io Editorial'),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    draft: z.boolean().default(false),
  }),
});

export const TOOL_CATEGORIES = ['ai-pr-review', 'code-quality', 'static-analysis', 'security', 'ide-assistant'] as const;
export const STANDARD_STATUS = ['yes', 'partial', 'no', 'unknown'] as const;

const toolsCollection = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/tools" }),
  schema: z.object({
    name: z.string(),
    website: z.string(),
    tagline: z.string(),
    category: z.enum(TOOL_CATEGORIES),
    openSource: z.boolean(),
    license: z.string(),
    pricing: z.string(),
    pricingUrl: z.string(),
    selfHosted: z.enum(['full', 'enterprise-only', 'byok', 'none', 'unknown']),
    selfHostedNote: z.string(),
    platforms: z.array(z.string()),
    modelControl: z.string(),
    lastVerified: z.string(),
    standards: z.record(z.string(), z.object({
      status: z.enum(STANDARD_STATUS),
      note: z.string(),
    })),
    relatedPosts: z.array(z.string()).default([]),
  }),
});

export const collections = {
  pillars: pillarsCollection,
  blog: blogCollection,
  tools: toolsCollection,
};

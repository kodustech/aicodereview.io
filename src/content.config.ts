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

    // --- Optional enrichment. Every value here must be readable from the same
    // primary sources as `pricing`/`selfHostedNote`; unset means "not verified".
    /** Cheapest paid entry point, as printed by the vendor. e.g. "$24/dev/mo". */
    startingPrice: z.string().optional(),
    /** Whether a permanently free tier exists (trial-only counts as `trial`). */
    freeTier: z.enum(['yes', 'limited', 'trial', 'no', 'unknown']).default('unknown'),
    /** Languages the vendor documents. Empty = not published as a list. */
    languages: z.array(z.string()).default([]),
    /** Public source repository, when the tool has one. */
    repoUrl: z.string().optional(),
    /** Documentation root, used for "check our work" source links. */
    docsUrl: z.string().optional(),
  }),
});

export const GLOSSARY_CATEGORIES = ['review-practice', 'ai', 'quality', 'security', 'delivery', 'metrics'] as const;

const glossaryCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/glossary" }),
  schema: z.object({
    term: z.string(),
    /** One or two sentences. Doubles as the meta description and the DefinedTerm description. */
    definition: z.string(),
    category: z.enum(GLOSSARY_CATEGORIES),
    /** Other glossary slugs worth reading next. */
    related: z.array(z.string()).default([]),
    /** Tool slugs that implement or relate to the term. */
    relatedTools: z.array(z.string()).default([]),
    relatedPosts: z.array(z.string()).default([]),
    /** Alternate spellings/acronyms — fed to search and to schema `alternateName`. */
    aliases: z.array(z.string()).default([]),
    updated: z.string(),
  }),
});

const learnCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/learn" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Ordering on the /learn hub. */
    order: z.number(),
    updated: z.coerce.date(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    relatedTools: z.array(z.string()).default([]),
    relatedPosts: z.array(z.string()).default([]),
    relatedTerms: z.array(z.string()).default([]),
  }),
});

export const collections = {
  pillars: pillarsCollection,
  blog: blogCollection,
  tools: toolsCollection,
  glossary: glossaryCollection,
  learn: learnCollection,
};

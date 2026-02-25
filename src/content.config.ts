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

export const collections = {
  pillars: pillarsCollection,
};
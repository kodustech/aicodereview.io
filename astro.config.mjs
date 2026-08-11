// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://aicodereview.io',
  // Static by default; only routes that opt out (export const prerender = false),
  // like /api/posts, become Vercel serverless functions.
  output: 'static',
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx(), sitemap({
    // Keep non-HTML endpoints (feeds, llms.txt, raw-markdown mirrors) out of the sitemap.
    filter: (page) => !/\.(xml|txt|md|json)$/.test(new URL(page).pathname) && !page.includes('/api/'),
  })]
});

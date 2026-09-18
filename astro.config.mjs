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
  // The home page is now the directory itself; /tools kept its authority by
  // pointing at it rather than serving a second copy of the same list.
  // /tools is a 301 to the home page, which is now the directory itself.
  // Astro collapses the trailing-slash spelling into the same route, so the
  // indexed /tools/ URL is covered by public/tools/index.html instead.
  redirects: {
    '/tools': '/',
  },
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx(), sitemap({
    // Keep non-HTML endpoints (feeds, llms.txt, raw-markdown mirrors) out of the sitemap.
    filter: (page) => !/\.(xml|txt|md|json)$/.test(new URL(page).pathname) && !page.includes('/api/'),
  })]
});

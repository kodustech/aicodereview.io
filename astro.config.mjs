// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { sitemapSerialize } from './scripts/sitemap-lastmod.mjs';

// Old slugs that now live at src/pages/blog/<slug>.astro as SSR routes issuing
// a real 301 (see those files for why: the static `redirects` map above can't
// produce a true redirect for the indexed trailing-slash spelling). They're
// real Astro pages, so the sitemap integration would otherwise list them
// alongside the posts they redirect to.
const REDIRECT_ONLY_BLOG_SLUGS = [
  'coderabbit-alternatives-7-tools-compared',
  'best-ai-code-review-tools-12-tools-compared',
  'coderabbit-vs-greptile-which-to-pick-in-2026',
  'cursor-bugbot-vs-coderabbit-2026-comparison',
  'ai-code-review-statistics-2026-sourced-data',
];

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
  //
  // Same pattern for the two retired Pullfrog-vs-CodeRabbit drafts: this 301
  // covers the no-slash form, and public/blog/<slug>/index.html covers the
  // indexed trailing-slash form.
  redirects: {
    '/tools': '/',
    '/blog/pullfrog-vs-coderabbit-the-harness-not-the-model-is-the-review': '/blog/pullfrog-vs-coderabbit-dont-compare-the-wrong-thing/',
    '/blog/pullfrog-vs-coderabbit-what-a-byok-bot-actually-changes-for-ai-code-review': '/blog/pullfrog-vs-coderabbit-dont-compare-the-wrong-thing/',
    // Renamed to disambiguate from the "How to Evaluate AI Code Review Tools"
    // playbook — the old title was a near-duplicate of that post's title.
    '/blog/how-to-actually-evaluate-an-ai-code-review-tool': '/blog/fluent-but-structurally-wrong-ai-code-review-failure-mode/',
  },
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx(), sitemap({
    // Keep non-HTML endpoints (feeds, llms.txt, raw-markdown mirrors) and
    // redirect-only routes out of the sitemap.
    filter: (page) => {
      const pathname = new URL(page).pathname;
      if (/\.(xml|txt|md|json)$/.test(pathname) || pathname.includes('/api/')) return false;
      return !REDIRECT_ONLY_BLOG_SLUGS.some((slug) => pathname === `/blog/${slug}/` || pathname === `/blog/${slug}`);
    },
    // Per-URL <lastmod>: blog frontmatter, tool lastVerified, or the git date
    // of the file that renders everything else. See scripts/sitemap-lastmod.mjs.
    serialize: sitemapSerialize,
  })]
});

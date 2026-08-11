# aicodereview.io

The 2026 engineering standard for evaluating AI Code Review tools — 9 pillars, a readiness assessment, and an SEO/GEO-focused blog. Maintained by [Kodus](https://kodus.io).

Built with [Astro 5](https://astro.build) + Tailwind, deployed on Vercel. Pages are prerendered (static HTML on the CDN); only `/api/*` runs on demand as a Vercel serverless function.

## Structure

```text
src/
├── content/
│   ├── pillars/   # the 9 standards (MDX)
│   └── blog/      # blog posts (MDX) — created by hand or via the content API
├── pages/
│   ├── index.astro                 # manifesto homepage
│   ├── assessment.astro            # readiness assessment
│   ├── standards/[slug].astro      # one page per pillar
│   ├── blog/                       # blog index, post, category pages + raw .md mirrors
│   ├── api/posts.ts                # content API (see CONTENT-API.md)
│   ├── rss.xml.ts                  # RSS feed
│   ├── llms.txt.ts                 # LLM-friendly site index (GEO)
│   └── llms-full.txt.ts            # full site content for LLM ingestion (GEO)
└── lib/blog.ts                     # blog helpers
```

## Commands

| Command | Action |
| :-- | :-- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Build (static pages + `.vercel/output` with the `/api` function) |

## Content API

Programmatic publishing (`POST /api/posts`, git-backed): see [CONTENT-API.md](./CONTENT-API.md). Copy `.env.example` to `.env` and set `CONTENT_API_KEY` to use it locally.

## SEO/GEO notes

- Every blog post ships with `Article` + `FAQPage` JSON-LD, OG/Twitter meta, canonical URL, and a raw-markdown mirror at `/blog/<slug>.md`.
- `/llms.txt` and `/llms-full.txt` expose the site to AI engines; `robots.txt` explicitly welcomes AI crawlers — being cited by LLMs is part of the distribution strategy.
- Sitemap is generated at build (`/sitemap-index.xml`), filtered to HTML pages only.

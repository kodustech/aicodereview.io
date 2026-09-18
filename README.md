# aicodereview.io

An independent directory of AI code review tools, each scored against a public 9-pillar standard, plus head-to-head comparisons, guides, a glossary and a blog. Funded by [Kodus](https://kodus.io), who build one of the listed tools and are scored by the same rubric.

Built with [Astro 5](https://astro.build) + Tailwind 4, deployed on Vercel. Pages are prerendered (static HTML on the CDN); only `/api/*` runs on demand as a serverless function.

## Structure

```text
src/
├── content/
│   ├── tools/     # one JSON file per tool — the dataset behind every score
│   ├── pillars/   # the 9 standards (MDX)
│   ├── glossary/  # glossary terms (MDX)
│   ├── learn/     # long-form guides (MDX)
│   └── blog/      # blog posts (MDX) — by hand or via the content API
├── lib/
│   ├── score.ts   # the scoring rubric: statuses → weights → coverage score
│   ├── tools.ts   # directory ordering, labels, derived pros/cons
│   ├── compare.ts # which pairs get a page, and the generated verdict prose
│   ├── blog.ts    # blog helpers, tags, related posts
│   └── glossary.ts
└── pages/
    ├── index.astro               # the directory (home)
    ├── tools/[slug].astro        # tool profile (+ .md mirror)
    ├── tools/category/…          # category, self-hosted and open-source views
    ├── compare/[pair].astro      # generated head-to-head comparisons
    ├── standards/                # the 9 pillars + per-pillar market coverage
    ├── glossary/, learn/, blog/  # reference and editorial
    ├── methodology.astro         # the rubric and the funding disclosure
    ├── api/posts.ts              # content API (see CONTENT-API.md)
    └── llms.txt.ts, llms-full.txt.ts, rss.xml.ts, search-index.json.ts
```

## Commands

| Command | Action |
| :-- | :-- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Build (static pages + `.vercel/output` with the `/api` function) |

## Scoring

Each tool is mapped against the 9 standards with four statuses: documented (1 point), partial (0.5), not offered (0), undocumented (0). The sum is the coverage score out of 9, and it drives the directory order, the comparison tables and the "best on this standard" lists.

Undocumented scores zero deliberately — a capability a buyer cannot verify is one they cannot rely on — and every profile shows how many pillars are undocumented so a low score can be read correctly. The full rationale is on `/methodology/`.

Adding or correcting a tool means editing one JSON file in `src/content/tools/`. Every field must be readable from a primary source (the vendor's pricing page, docs or repository) and stamped with `lastVerified`; fields with no public source are left unset rather than estimated.

## Content API

Programmatic publishing (`POST /api/posts`, git-backed): see [CONTENT-API.md](./CONTENT-API.md). Copy `.env.example` to `.env` and set `CONTENT_API_KEY` to use it locally.

## SEO/GEO notes

- Structured data per page type: `ItemList` on the directory and every filtered view, `SoftwareApplication` + `Offer` on tool profiles, `DefinedTerm`/`DefinedTermSet` on the glossary, `Article` on posts and guides, `FAQPage` wherever there is an FAQ, plus `BreadcrumbList` and a site-level `Organization`/`WebSite` graph.
- `/llms.txt` and `/llms-full.txt` expose the whole site to AI engines; `robots.txt` explicitly welcomes AI crawlers. Raw markdown mirrors exist for posts (`/blog/<slug>.md`), tool profiles (`/tools/<slug>.md`) and glossary terms (`/glossary/<term>.md`).
- Comparison pages are generated from the dataset for a curated set of pairs (`src/lib/compare.ts`); pairs that already have a hand-written article are skipped so the two never compete for the same keyword.
- `/tools` redirects to `/`, which is the directory — one canonical page for the primary keyword.

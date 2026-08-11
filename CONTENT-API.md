# Content API

Programmatic publishing for the aicodereview.io blog. One endpoint, git-backed: in production every accepted post becomes a commit to this repo, which triggers the normal deploy pipeline and rebuilds the static site (fast pages, full SEO — no client-side rendering).

## Endpoints

### `GET /api/posts`

Lists all posts known to the current build (slug, title, category, pubDate, url). No auth.

### `POST /api/posts`

Creates (or overwrites) a blog post. Requires `Authorization: Bearer <CONTENT_API_KEY>`.

```bash
curl -X POST https://aicodereview.io/api/posts \
  -H "Authorization: Bearer $CONTENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Qodo vs CodeRabbit: Which Fits Your Team? (2026)",
    "description": "Head-to-head comparison of Qodo and CodeRabbit: context depth, pricing, self-hosting, and which teams each one fits best.",
    "category": "comparison",
    "tags": ["qodo", "coderabbit"],
    "content": "Full markdown body here. No H1 — the layout renders the title...",
    "faq": [
      { "q": "Is Qodo cheaper than CodeRabbit?", "a": "..." }
    ]
  }'
```

#### Fields

| Field | Required | Notes |
|---|---|---|
| `title` | yes | ≤90 chars (aim ≤60). Slug is derived from it unless `slug` is passed. |
| `description` | yes | ≤220 chars (aim ≤155). Used as meta description. |
| `content` | yes | Markdown body. **No H1** (layout renders the title). Tables/links allowed; it is stored as `.mdx`, so avoid raw `<` characters and JSX. |
| `category` | yes | One of `best-of`, `alternatives`, `comparison`, `guide`, `explainer`, `review`. |
| `slug` | no | kebab-case; derived from title if omitted. |
| `tags` | no | Array of lowercase strings. |
| `faq` | no | Array of `{ q, a }`. Rendered as FAQ section + `FAQPage` JSON-LD (GEO). |
| `author` | no | Defaults to "Kodus Engineering Team". |
| `pubDate` / `updatedDate` | no | ISO date. `pubDate` defaults to today. |
| `draft` | no | `true` hides the post from listing/build. |
| `overwrite` | no | Required `true` to replace an existing slug (returns 409 otherwise). |

#### Responses

- `201` — created; body includes `slug`, `url`, and `mode` (`github-commit` or `local-file`)
- `401` / `503` — auth missing/invalid or `CONTENT_API_KEY` unset
- `409` — slug exists and `overwrite` was not `true`
- `422` — validation errors (listed in `details`)

## Configuration (environment variables)

| Var | Purpose |
|---|---|
| `CONTENT_API_KEY` | Required. Bearer token for `POST`. Generate: `openssl rand -hex 32`. |
| `GITHUB_TOKEN` | If set, posts are committed to GitHub (production mode). Needs `contents: write` on the repo. Without it, posts are written to the local filesystem (dev mode — the dev server hot-reloads them). |
| `GITHUB_REPO` | Default `kodustech/aicodereview.io`. |
| `GITHUB_BRANCH` | Default `main`. |

## Running

- **Dev:** `CONTENT_API_KEY=test npm run dev` → POST to `http://localhost:4321/api/posts`, post appears immediately.
- **Production (Vercel):** `/api/posts` deploys as a serverless function automatically. Set `CONTENT_API_KEY` + `GITHUB_TOKEN` in the Vercel project's environment variables so posts are committed to the repo and redeployed; without `GITHUB_TOKEN` the API refuses writes (serverless filesystems are ephemeral) and returns 503.

> Note: because pages are prerendered at build time, a post accepted in production is live **after the deploy pipeline rebuilds** (usually 1–3 min), not instantly. That trade-off is deliberate: static HTML is what makes the SEO fast and cacheable.

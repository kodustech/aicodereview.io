import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = false;

const CATEGORIES = ['best-of', 'alternatives', 'comparison', 'guide', 'explainer', 'review'];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BLOG_DIR = 'src/content/blog';

function env(name: string): string | undefined {
  return process.env[name] ?? (import.meta.env as Record<string, string | undefined>)[name];
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '');
}

// JSON string literals are valid YAML scalars, so this is a safe way to quote user text.
function yamlStr(value: string): string {
  return JSON.stringify(value);
}

interface PostInput {
  title: string;
  description: string;
  content: string;
  category: string;
  slug?: string;
  tags?: string[];
  faq?: Array<{ q: string; a: string }>;
  author?: string;
  pubDate?: string;
  updatedDate?: string;
  draft?: boolean;
  overwrite?: boolean;
}

function validate(input: unknown): { ok: true; value: PostInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const body = (input ?? {}) as Record<string, unknown>;

  if (typeof body.title !== 'string' || body.title.trim().length < 5) errors.push('title: required string (min 5 chars)');
  else if (body.title.length > 90) errors.push('title: max 90 chars (aim for ≤60 for SEO)');

  if (typeof body.description !== 'string' || body.description.trim().length < 20) errors.push('description: required string (min 20 chars)');
  else if (body.description.length > 220) errors.push('description: max 220 chars (aim for ≤155 for SEO)');

  if (typeof body.content !== 'string' || body.content.trim().length < 100) errors.push('content: required markdown string (min 100 chars)');

  if (typeof body.category !== 'string' || !CATEGORIES.includes(body.category)) errors.push(`category: must be one of ${CATEGORIES.join(', ')}`);

  if (body.slug !== undefined && (typeof body.slug !== 'string' || !SLUG_RE.test(body.slug))) errors.push('slug: lowercase kebab-case only (a-z, 0-9, hyphens)');

  if (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.some((t) => typeof t !== 'string'))) errors.push('tags: must be an array of strings');

  if (body.faq !== undefined) {
    if (!Array.isArray(body.faq) || body.faq.some((f) => typeof f?.q !== 'string' || typeof f?.a !== 'string')) {
      errors.push('faq: must be an array of { q: string, a: string }');
    }
  }

  for (const dateField of ['pubDate', 'updatedDate'] as const) {
    if (body[dateField] !== undefined && (typeof body[dateField] !== 'string' || Number.isNaN(Date.parse(body[dateField] as string)))) {
      errors.push(`${dateField}: must be an ISO date string (e.g. 2026-08-11)`);
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: body as unknown as PostInput };
}

function buildMdx(post: PostInput, slug: string): string {
  const pubDate = (post.pubDate ?? new Date().toISOString()).slice(0, 10);
  const lines: string[] = [
    '---',
    `title: ${yamlStr(post.title.trim())}`,
    `description: ${yamlStr(post.description.trim())}`,
    `pubDate: ${pubDate}`,
  ];
  if (post.updatedDate) lines.push(`updatedDate: ${post.updatedDate.slice(0, 10)}`);
  lines.push(`category: ${yamlStr(post.category)}`);
  lines.push(`tags: [${(post.tags ?? []).map((t) => yamlStr(t.toLowerCase())).join(', ')}]`);
  if (post.author) lines.push(`author: ${yamlStr(post.author)}`);
  if (post.faq?.length) {
    lines.push('faq:');
    for (const f of post.faq) {
      lines.push(`  - q: ${yamlStr(f.q)}`);
      lines.push(`    a: ${yamlStr(f.a)}`);
    }
  }
  if (post.draft) lines.push('draft: true');
  lines.push('---', '', post.content.trim(), '');
  return lines.join('\n');
}

async function commitToGitHub(path: string, content: string, slug: string, overwrite: boolean) {
  const token = env('GITHUB_TOKEN')!;
  const repo = env('GITHUB_REPO') ?? 'kodustech/aicodereview.io';
  const branch = env('GITHUB_BRANCH') ?? 'main';
  const apiBase = `https://api.github.com/repos/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };

  let sha: string | undefined;
  const existing = await fetch(`${apiBase}?ref=${branch}`, { headers });
  if (existing.ok) {
    if (!overwrite) return { status: 409 as const, error: `post "${slug}" already exists; pass overwrite: true to replace it` };
    sha = (await existing.json()).sha;
  }

  const res = await fetch(apiBase, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `content: ${sha ? 'update' : 'add'} blog post "${slug}" via content API`,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    return { status: 502 as const, error: `GitHub API error (${res.status}): ${detail.slice(0, 300)}` };
  }
  const data = await res.json();
  return { status: 201 as const, commit: data.commit?.sha as string | undefined };
}

async function writeLocal(path: string, content: string, slug: string, overwrite: boolean) {
  const { existsSync } = await import('node:fs');
  const { writeFile, mkdir } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const abs = join(process.cwd(), path);
  if (existsSync(abs) && !overwrite) {
    return { status: 409 as const, error: `post "${slug}" already exists; pass overwrite: true to replace it` };
  }
  await mkdir(join(process.cwd(), BLOG_DIR), { recursive: true });
  await writeFile(abs, content, 'utf-8');
  return { status: 201 as const, file: abs };
}

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog');
  return json(200, {
    count: posts.length,
    posts: posts
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
      .map((p) => ({
        slug: p.id,
        title: p.data.title,
        category: p.data.category,
        pubDate: p.data.pubDate.toISOString().slice(0, 10),
        draft: p.data.draft,
        url: `https://aicodereview.io/blog/${p.id}/`,
      })),
  });
};

export const POST: APIRoute = async ({ request }) => {
  const apiKey = env('CONTENT_API_KEY');
  if (!apiKey) {
    return json(503, { error: 'CONTENT_API_KEY is not configured on the server' });
  }
  const auth = request.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${apiKey}`) {
    return json(401, { error: 'invalid or missing Authorization: Bearer <CONTENT_API_KEY> header' });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: 'request body must be valid JSON' });
  }

  const result = validate(payload);
  if (!result.ok) return json(422, { error: 'validation failed', details: result.errors });

  const post = result.value;
  const slug = post.slug ?? slugify(post.title);
  if (!SLUG_RE.test(slug)) return json(422, { error: `could not derive a valid slug from title; pass "slug" explicitly` });

  const path = `${BLOG_DIR}/${slug}.mdx`;
  const mdx = buildMdx(post, slug);

  // With a GITHUB_TOKEN we commit to the repo (production: triggers the deploy pipeline,
  // which rebuilds the static pages). Without it we write to the local filesystem
  // (development: the dev server hot-reloads the new post immediately).
  const useGitHub = Boolean(env('GITHUB_TOKEN'));
  if (!useGitHub && env('VERCEL')) {
    // Serverless filesystems are ephemeral — a local write would silently vanish.
    return json(503, { error: 'GITHUB_TOKEN is not configured; on Vercel the API can only publish by committing to the repo' });
  }
  const outcome = useGitHub
    ? await commitToGitHub(path, mdx, slug, post.overwrite ?? false)
    : await writeLocal(path, mdx, slug, post.overwrite ?? false);

  if (outcome.status !== 201) {
    return json(outcome.status, { error: outcome.error });
  }

  return json(201, {
    ok: true,
    slug,
    mode: useGitHub ? 'github-commit' : 'local-file',
    path,
    url: `https://aicodereview.io/blog/${slug}/`,
    note: useGitHub
      ? 'Committed to the repo; the post goes live when the deploy pipeline finishes rebuilding.'
      : 'Written to the local content directory; visible immediately on the dev server.',
  });
};

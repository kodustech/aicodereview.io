import type { APIContext } from 'astro';
import { getTerms } from '../../lib/glossary';
import { SITE_URL } from '../../lib/blog';

// Raw markdown mirror of each glossary entry, for AI crawlers and agents (GEO).
export async function getStaticPaths() {
  const terms = await getTerms();
  return terms.map((term) => ({ params: { term: term.id }, props: { term } }));
}

export async function GET({ props }: APIContext) {
  const { term } = props as any;
  const header = [
    `# ${term.data.term}`,
    '',
    `> ${term.data.definition}`,
    '',
    ...(term.data.aliases.length ? [`Also known as: ${term.data.aliases.join(', ')}`, ''] : []),
    `- Canonical: ${SITE_URL}/glossary/${term.id}/`,
    `- Updated: ${term.data.updated}`,
    '',
    '---',
    '',
  ].join('\n');

  return new Response(header + (term.body ?? ''), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

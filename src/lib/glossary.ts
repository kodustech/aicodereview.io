import { getCollection, type CollectionEntry } from 'astro:content';

export type Term = CollectionEntry<'glossary'>;
export type Guide = CollectionEntry<'learn'>;

export const GLOSSARY_CATEGORY_LABELS: Record<string, string> = {
  'review-practice': 'Review practice',
  'ai': 'AI & models',
  'quality': 'Code quality',
  'security': 'Security',
  'delivery': 'Delivery & CI',
  'metrics': 'Metrics',
};

export async function getTerms(): Promise<Term[]> {
  const terms = await getCollection('glossary');
  return terms.sort((a, b) => a.data.term.localeCompare(b.data.term));
}

export async function getGuides(): Promise<Guide[]> {
  const guides = await getCollection('learn');
  return guides.sort((a, b) => a.data.order - b.data.order);
}

/** A–Z buckets for the glossary index jump-nav. */
export function groupByLetter(terms: Term[]): Array<{ letter: string; terms: Term[] }> {
  const map = new Map<string, Term[]>();
  for (const term of terms) {
    const letter = term.data.term[0].toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : '#';
    map.set(key, [...(map.get(key) ?? []), term]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([letter, list]) => ({ letter, terms: list }));
}

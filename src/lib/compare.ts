import type { Tool } from './tools';
import { SELF_HOSTED_LABELS, SELF_HOSTED_PROSE, FREE_TIER_LABELS, platformLabel, scoreTool, statusOf, noteOf } from './tools';
import { PILLAR_IDS, PILLAR_SHORT, PILLAR_PROSE, type Status } from './score';

/**
 * Head-to-head pages are generated, so the pair list is curated rather than
 * combinatorial: 26 tools would otherwise produce 325 near-identical URLs.
 * Anchors are the tools buyers actually search against by name.
 */
export const COMPARE_ANCHORS = [
  'coderabbit',
  'kodus',
  'greptile',
  'qodo',
  'cursor-bugbot',
  'github-copilot-code-review',
] as const;

/** Anchors that get paired with the whole AI-PR-review field, not just other anchors. */
const BROAD_ANCHORS = ['coderabbit', 'kodus'] as const;

export interface Pair {
  a: Tool;
  b: Tool;
  slug: string;
}

/** Canonical slug is alphabetical, so a pair never has two URLs. */
export function pairSlug(x: string, y: string): string {
  return [x, y].sort().join('-vs-');
}

/**
 * @param excludeSlugs pairs already covered by a hand-written blog post — those
 * keep the article as the single page targeting the keyword.
 */
export function buildPairs(tools: Tool[], excludeSlugs: Set<string> = new Set()): Pair[] {
  const byId = new Map(tools.map((t) => [t.id, t]));
  const wanted = new Set<string>();

  const add = (x: string, y: string) => {
    if (x === y || !byId.has(x) || !byId.has(y)) return;
    wanted.add(pairSlug(x, y));
  };

  for (const anchor of COMPARE_ANCHORS) {
    for (const other of COMPARE_ANCHORS) add(anchor, other);
  }
  for (const anchor of BROAD_ANCHORS) {
    for (const tool of tools) {
      if (tool.data.category === 'ai-pr-review') add(anchor, tool.id);
    }
  }

  return [...wanted]
    .filter((slug) => !excludeSlugs.has(slug))
    .sort()
    .map((slug) => {
      const [x, y] = slug.split('-vs-');
      return { a: byId.get(x)!, b: byId.get(y)!, slug };
    });
}

export interface SpecRow {
  label: string;
  a: string;
  b: string;
  /** True when the two tools genuinely differ — drives the "differences only" view. */
  differs: boolean;
}

export function specRows(a: Tool, b: Tool): SpecRow[] {
  const rows: Array<[string, string, string]> = [
    ['Licensing', a.data.openSource ? `Open source — ${a.data.license}` : 'Proprietary', b.data.openSource ? `Open source — ${b.data.license}` : 'Proprietary'],
    ['Self-hosting', SELF_HOSTED_LABELS[a.data.selfHosted], SELF_HOSTED_LABELS[b.data.selfHosted]],
    ['Free tier', FREE_TIER_LABELS[a.data.freeTier], FREE_TIER_LABELS[b.data.freeTier]],
    ['Pricing', a.data.pricing, b.data.pricing],
    ['Model control', a.data.modelControl, b.data.modelControl],
    ['Platforms', a.data.platforms.map(platformLabel).join(', ') || 'Unknown', b.data.platforms.map(platformLabel).join(', ') || 'Unknown'],
    ['Last verified', a.data.lastVerified, b.data.lastVerified],
  ];
  return rows.map(([label, av, bv]) => ({ label, a: av, b: bv, differs: av !== bv }));
}

export interface PillarRow {
  id: string;
  short: string;
  a: { status: Status; note: string };
  b: { status: Status; note: string };
  /** 'a' | 'b' when one is strictly better documented, 'tie' otherwise. */
  edge: 'a' | 'b' | 'tie';
}

const RANK: Record<Status, number> = { yes: 3, partial: 2, no: 1, unknown: 0 };

export function pillarRows(a: Tool, b: Tool): PillarRow[] {
  return PILLAR_IDS.map((id) => {
    const sa = statusOf(a, id);
    const sb = statusOf(b, id);
    return {
      id,
      short: PILLAR_SHORT[id] ?? id,
      a: { status: sa, note: noteOf(a, id) },
      b: { status: sb, note: noteOf(b, id) },
      edge: RANK[sa] === RANK[sb] ? 'tie' : RANK[sa] > RANK[sb] ? 'a' : 'b',
    };
  });
}

export interface Verdict {
  headline: string;
  paragraphs: string[];
  pickA: string;
  pickB: string;
}

const list = (items: string[]): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};

const shorts = (ids: string[]): string[] => ids.map((id) => PILLAR_PROSE[id] ?? (PILLAR_SHORT[id] ?? id).toLowerCase());

/**
 * Every sentence below is a restatement of the matrix. Nothing is asserted that
 * the two tool pages don't already show with a source link.
 */
export function verdict(a: Tool, b: Tool): Verdict {
  const rows = pillarRows(a, b);
  const aWins = rows.filter((r) => r.edge === 'a');
  const bWins = rows.filter((r) => r.edge === 'b');
  const ties = rows.filter((r) => r.edge === 'tie');
  const sa = scoreTool(a);
  const sb = scoreTool(b);
  const an = a.data.name;
  const bn = b.data.name;

  const headline =
    sa.score === sb.score
      ? `${an} and ${bn} both score ${sa.score}/9 — the difference is which standards they cover.`
      : sa.score > sb.score
        ? `${an} covers more of the baseline (${sa.score}/9 vs ${sb.score}/9), but the split matters more than the total.`
        : `${bn} covers more of the baseline (${sb.score}/9 vs ${sa.score}/9), but the split matters more than the total.`;

  const paragraphs: string[] = [];

  if (aWins.length || bWins.length) {
    paragraphs.push(
      `Across the 9 standards, ${an} is better documented on ${aWins.length} (${list(shorts(aWins.map((r) => r.id))) || 'none'}), ` +
      `${bn} on ${bWins.length} (${list(shorts(bWins.map((r) => r.id))) || 'none'}), and ${ties.length} come out even.`
    );
  } else {
    paragraphs.push(`Across the 9 standards these two tools document the same posture on every pillar — the decision comes down to licensing, hosting, and price.`);
  }

  const hostingDiff = a.data.selfHosted !== b.data.selfHosted;
  if (hostingDiff) {
    paragraphs.push(
      `On deployment they are not interchangeable: ${an} is ${SELF_HOSTED_PROSE[a.data.selfHosted]}, while ${bn} is ${SELF_HOSTED_PROSE[b.data.selfHosted]}. ` +
      `If code cannot leave your network, that single row decides the evaluation before anything else on this page.`
    );
  }

  if (a.data.openSource !== b.data.openSource) {
    const [oss, closed] = a.data.openSource ? [a, b] : [b, a];
    paragraphs.push(`${oss.data.name} publishes its source under ${oss.data.license}; ${closed.data.name} is proprietary. That changes what you can audit, fork, and keep running if the vendor's terms change.`);
  }

  const pickReason = (tool: Tool, own: string[], score: ReturnType<typeof scoreTool>) => {
    const reasons: string[] = [];
    if (own.length) reasons.push(`you care most about ${list(shorts(own).slice(0, 3))}`);
    if (tool.data.selfHosted === 'full') reasons.push('the reviewer has to run inside your own infrastructure');
    if (tool.data.openSource) reasons.push('you want to read the source before you trust it');
    if (score.strengths.includes('07-economic-transparency')) reasons.push('you want model choice and visible token cost');
    if (reasons.length === 0) reasons.push('its documented coverage lines up with how your team already works');
    return `Pick ${tool.data.name} if ${list(reasons.slice(0, 3))}.`;
  };

  return {
    headline,
    paragraphs,
    pickA: pickReason(a, aWins.map((r) => r.id), sa),
    pickB: pickReason(b, bWins.map((r) => r.id), sb),
  };
}

/** FAQ entries built from verified fields only — skipped when a field is unknown. */
export function compareFaq(a: Tool, b: Tool): Array<{ q: string; a: string }> {
  const out: Array<{ q: string; a: string }> = [];
  const an = a.data.name;
  const bn = b.data.name;
  const sa = scoreTool(a);
  const sb = scoreTool(b);

  out.push({
    q: `What is the main difference between ${an} and ${bn}?`,
    a: `${verdict(a, b).headline} ${an} is ${SELF_HOSTED_PROSE[a.data.selfHosted]} and ${a.data.openSource ? `open source under ${a.data.license}` : 'proprietary'}; ${bn} is ${SELF_HOSTED_PROSE[b.data.selfHosted]} and ${b.data.openSource ? `open source under ${b.data.license}` : 'proprietary'}.`,
  });

  if (a.data.startingPrice && b.data.startingPrice) {
    out.push({
      q: `Is ${an} cheaper than ${bn}?`,
      a: `${an} starts at ${a.data.startingPrice} and ${bn} at ${b.data.startingPrice}, as published by each vendor on ${a.data.lastVerified} and ${b.data.lastVerified}. Compare total cost rather than seat price: ${an} bills models as ${a.data.modelControl.toLowerCase()}, ${bn} as ${b.data.modelControl.toLowerCase()}.`,
    });
  }

  if (a.data.selfHosted !== b.data.selfHosted) {
    out.push({
      q: `Can ${an} and ${bn} be self-hosted?`,
      a: `${an}: ${SELF_HOSTED_LABELS[a.data.selfHosted]}${a.data.selfHostedNote ? ` — ${a.data.selfHostedNote}` : ''} ${bn}: ${SELF_HOSTED_LABELS[b.data.selfHosted]}${b.data.selfHostedNote ? ` — ${b.data.selfHostedNote}` : ''}`,
    });
  }

  const shared = a.data.platforms.filter((p) => b.data.platforms.includes(p));
  out.push({
    q: `Do ${an} and ${bn} support the same platforms?`,
    a: shared.length
      ? `Both document support for ${list(shared.map(platformLabel))}. ${an} additionally documents ${list(a.data.platforms.filter((p) => !shared.includes(p)).map(platformLabel)) || 'nothing else'}; ${bn} adds ${list(b.data.platforms.filter((p) => !shared.includes(p)).map(platformLabel)) || 'nothing else'}.`
      : `They document no overlapping platforms: ${an} covers ${list(a.data.platforms.map(platformLabel)) || 'none publicly'}, ${bn} covers ${list(b.data.platforms.map(platformLabel)) || 'none publicly'}.`,
  });

  out.push({
    q: `Which one scores higher against the 9-pillar standard?`,
    a: sa.score === sb.score
      ? `They tie at ${sa.score}/9. ${an} has ${sa.verified} of 9 pillars backed by public documentation, ${bn} has ${sb.verified}.`
      : `${sa.score > sb.score ? an : bn} scores ${Math.max(sa.score, sb.score)}/9 against ${Math.min(sa.score, sb.score)}/9. The score is coverage of documented capability, not quality of findings — the full formula is on the methodology page.`,
  });

  return out;
}

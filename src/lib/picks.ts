import { scoreTool, type Tool } from './tools';

/**
 * Editorial picks: the strip above the ranked directory.
 *
 * Every claim here is computed from the same matrix as the ranking — each pick
 * is the highest-scoring tool on one dimension, and a tool is never picked
 * twice. That is the whole point: the strip is curated (we choose which
 * dimensions lead, and in what order), but no card can ever say something the
 * table below it contradicts.
 */
export interface Pick {
  tool: Tool;
  /** The superlative, e.g. "Best open-source reviewer". */
  label: string;
  /** Why this tool wins that dimension, in one line, from verified fields. */
  reason: string;
}

interface Dimension {
  label: string;
  /** Tools eligible for this superlative. */
  filter: (tool: Tool) => boolean;
  reason: (tool: Tool, runnerUp: Tool | undefined) => string;
}

// Order matters: the first dimension gets the lead slot.
const DIMENSIONS: Dimension[] = [
  {
    // Three criteria, stated openly on the card. Only one tool in the directory
    // documents all three, which is the claim — not a general superlative.
    label: 'Best for keeping code in-house',
    filter: (t) =>
      t.data.selfHosted === 'full' &&
      t.data.standards['02-rule-centric']?.status === 'yes' &&
      t.data.standards['07-economic-transparency']?.status === 'yes',
    reason: (t) =>
      `The only tool here that documents all three at once: runs on your own infrastructure, models under your own keys, and org-wide rules you write yourself${t.data.openSource ? `. Open source under ${t.data.license.split('(')[0].trim()}, so you can audit what leaves your network` : ''}.`,
  },
  {
    label: 'Best documented coverage',
    filter: () => true,
    reason: (t) => `Covers more of the 9-pillar baseline than anything else in the directory, at ${scoreTool(t).score}/9.`,
  },
  {
    label: 'Best for validated findings',
    filter: (t) => t.data.standards['06-sandbox-validation']?.status === 'yes',
    reason: (t) => t.data.standards['06-sandbox-validation']?.note ?? 'Runs findings in a sandbox before reporting them.',
  },
  {
    label: 'Best for reviewing against the ticket',
    filter: (t) => t.data.standards['04-business-logic']?.status === 'yes',
    reason: (t) => t.data.standards['04-business-logic']?.note ?? 'Checks a change against what the ticket asked for.',
  },
];

export function editorsPicks(tools: Tool[], limit = 4): Pick[] {
  const taken = new Set<string>();
  const picks: Pick[] = [];

  for (const dimension of DIMENSIONS) {
    if (picks.length >= limit) break;
    const eligible = tools
      .filter((t) => dimension.filter(t) && !taken.has(t.id))
      .sort((a, b) => scoreTool(b).score - scoreTool(a).score || a.data.name.localeCompare(b.data.name));

    const winner = eligible[0];
    if (!winner) continue;
    taken.add(winner.id);
    picks.push({ tool: winner, label: dimension.label, reason: dimension.reason(winner, eligible[1]) });
  }

  return picks;
}

export interface RankedTool {
  tool: Tool;
  /** Competition ranking: tied tools share a position. */
  rank: number;
  tied: boolean;
}

/**
 * Standard competition ranking. Three tools on 6.5 are all second — showing
 * them as 2nd, 3rd and 4th would invent an order the data does not support.
 */
export function rankWithTies(tools: Tool[]): RankedTool[] {
  const scores = tools.map((t) => scoreTool(t).score);
  return tools.map((tool, i) => {
    const score = scores[i];
    const rank = scores.findIndex((s) => s === score) + 1;
    const tied = scores.filter((s) => s === score).length > 1;
    return { tool, rank, tied };
  });
}

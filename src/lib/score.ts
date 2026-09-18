import type { CollectionEntry } from 'astro:content';

export type Tool = CollectionEntry<'tools'>;
export type Status = 'yes' | 'partial' | 'no' | 'unknown';

/**
 * Coverage score: how much of the 9-pillar baseline a tool's own public
 * documentation backs up. Deliberately not a star rating — the inputs are the
 * same source-linked matrix shown on every tool page, so anyone can recompute it.
 *
 * `unknown` scores 0 on purpose: a capability nobody can find in the docs is a
 * capability a buyer can't count on. Tools carry a `verified` count so an
 * undocumented tool reads differently from a documented-but-limited one.
 */
export const STATUS_WEIGHTS: Record<Status, number> = {
  yes: 1,
  partial: 0.5,
  no: 0,
  unknown: 0,
};

export const PILLAR_COUNT = 9;

export const PILLAR_IDS = [
  '01-multi-dimensional-context',
  '02-rule-centric',
  '03-dual-workflow',
  '04-business-logic',
  '05-continuous-learning',
  '06-sandbox-validation',
  '07-economic-transparency',
  '08-actionability',
  '09-measurable-roi',
] as const;

/** Short labels for compact matrix headers and comparison tables. */
export const PILLAR_SHORT: Record<string, string> = {
  '01-multi-dimensional-context': 'Context',
  '02-rule-centric': 'Rules',
  '03-dual-workflow': 'Local + PR',
  '04-business-logic': 'Business logic',
  '05-continuous-learning': 'Learning',
  '06-sandbox-validation': 'Validation',
  '07-economic-transparency': 'Cost control',
  '08-actionability': 'Actionability',
  '09-measurable-roi': 'ROI',
};

/** Sentence-friendly pillar names, for generated prose. */
export const PILLAR_PROSE: Record<string, string> = {
  '01-multi-dimensional-context': 'context depth',
  '02-rule-centric': 'rule control',
  '03-dual-workflow': 'local and PR review',
  '04-business-logic': 'business-logic checks',
  '05-continuous-learning': 'learning from your team',
  '06-sandbox-validation': 'sandbox validation',
  '07-economic-transparency': 'cost control',
  '08-actionability': 'actionable fixes',
  '09-measurable-roi': 'ROI reporting',
};

export interface ToolScore {
  /** 0–9, one decimal. */
  score: number;
  /** 0–100, for bars and sorting ties. */
  percent: number;
  /** Pillars documented as fully met. */
  strengths: string[];
  /** Pillars documented as partially met. */
  partials: string[];
  /** Pillars the vendor documents as not offered. */
  gaps: string[];
  /** Pillars with no public evidence either way. */
  unknowns: string[];
  /** Pillars with any public evidence (9 − unknowns). */
  verified: number;
}

export function statusOf(tool: Tool, pillarId: string): Status {
  return (tool.data.standards[pillarId]?.status ?? 'unknown') as Status;
}

export function noteOf(tool: Tool, pillarId: string): string {
  return tool.data.standards[pillarId]?.note ?? '';
}

export function scoreTool(tool: Tool): ToolScore {
  const buckets: Record<Status, string[]> = { yes: [], partial: [], no: [], unknown: [] };
  let raw = 0;

  for (const pillarId of PILLAR_IDS) {
    const status = statusOf(tool, pillarId);
    buckets[status].push(pillarId);
    raw += STATUS_WEIGHTS[status];
  }

  return {
    score: Math.round(raw * 10) / 10,
    percent: Math.round((raw / PILLAR_COUNT) * 100),
    strengths: buckets.yes,
    partials: buckets.partial,
    gaps: buckets.no,
    unknowns: buckets.unknown,
    verified: PILLAR_COUNT - buckets.unknown.length,
  };
}

/** Sort by score, then by how much of the matrix is actually evidenced, then A–Z. */
export function compareByScore(a: Tool, b: Tool): number {
  const sa = scoreTool(a);
  const sb = scoreTool(b);
  return sb.score - sa.score || sb.verified - sa.verified || a.data.name.localeCompare(b.data.name);
}

/** Bar glyphs for the terminal-style score meter (9 cells, half-steps allowed). */
export function scoreCells(score: ToolScore): Array<'full' | 'half' | 'empty'> {
  const cells: Array<'full' | 'half' | 'empty'> = [];
  let remaining = score.score;
  for (let i = 0; i < PILLAR_COUNT; i++) {
    if (remaining >= 1) {
      cells.push('full');
      remaining -= 1;
    } else if (remaining >= 0.5) {
      cells.push('half');
      remaining -= 0.5;
    } else {
      cells.push('empty');
    }
  }
  return cells;
}

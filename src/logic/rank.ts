import { THRESHOLDS } from '../config/thresholds';
import type { Status } from './types';

export interface OutletRiskInput {
  outletId: string;
  lines: readonly { status: Status; stockValue: number; daysToActBy: number | null }[];
  openFlags: number;
}

export type RankReason =
  | { code: 'red_lines'; count: number }
  | { code: 'act_by_soon'; days: number }
  | { code: 'amber_lines'; count: number }
  | { code: 'open_flags'; count: number }
  | { code: 'value_at_risk'; rupees: number };

export interface RankedOutlet {
  outletId: string;
  score: number;
  /** Most important first; the UI shows the top one or two as the "why". */
  reasons: RankReason[];
}

/** Today's beat ordered by risk, with plain reasons. Ties keep the original route order. */
export function rankBeat(outlets: readonly OutletRiskInput[], cfg = THRESHOLDS.ranking): RankedOutlet[] {
  const scored = outlets.map((o, routeIndex) => {
    const red = o.lines.filter((l) => l.status === 'red').length;
    const amber = o.lines.filter((l) => l.status === 'amber').length;
    const atRisk = o.lines.filter((l) => l.status !== 'green').reduce((s, l) => s + l.stockValue, 0);
    const actByDays = o.lines
      .filter((l) => l.status !== 'green' && l.daysToActBy != null)
      .map((l) => l.daysToActBy as number);
    const soonest = actByDays.length ? Math.min(...actByDays) : null;
    const urgency = actByDays.reduce((s, d) => s + Math.max(0, cfg.urgencyWindowDays - Math.max(0, d)), 0);

    const score =
      red * cfg.perRedLine +
      amber * cfg.perAmberLine +
      o.openFlags * cfg.perOpenFlag +
      (atRisk / 1000) * cfg.perThousandRupeesAtRisk +
      urgency;

    const reasons: RankReason[] = [];
    if (red) reasons.push({ code: 'red_lines', count: red });
    if (soonest != null && soonest <= cfg.urgencyWindowDays) reasons.push({ code: 'act_by_soon', days: soonest });
    if (amber) reasons.push({ code: 'amber_lines', count: amber });
    if (o.openFlags) reasons.push({ code: 'open_flags', count: o.openFlags });
    if (atRisk > 0) reasons.push({ code: 'value_at_risk', rupees: atRisk });

    return { outletId: o.outletId, score, reasons, routeIndex };
  });
  scored.sort((a, b) => b.score - a.score || a.routeIndex - b.routeIndex);
  return scored.map(({ outletId, score, reasons }) => ({ outletId, score, reasons }));
}

/** "3 batches reach act-by this week": counts upcoming and already-passed act-by dates. */
export function actByNudge(
  daysToActBy: readonly (number | null)[],
  cfg = THRESHOLDS.nudges,
): { thisWeek: number; overdue: number } {
  let thisWeek = 0;
  let overdue = 0;
  for (const d of daysToActBy) {
    if (d == null) continue;
    if (d < 0) overdue++;
    else if (d <= cfg.actByLookaheadDays) thisWeek++;
  }
  return { thisWeek, overdue };
}

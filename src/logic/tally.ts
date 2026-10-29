import { THRESHOLDS } from '../config/thresholds';
import type { LadderRung } from './ladder';

/** How an at-risk line was resolved: sold through in the shop (amber playbook) or a ladder rung. */
export type RecoveryRoute = 'sell_through' | LadderRung;

export interface Resolution {
  route: RecoveryRoute;
  units: number;
  unitPrice: number;
  packagingGrams?: number;
  /** Shop and date of the resolution: lines from one shop on one day share one return pickup. */
  outletId?: string;
  date?: string;
}

export interface RouteTally {
  route: RecoveryRoute;
  units: number;
  rupeesSaved: number;
  packagingKg: number;
}

export interface SustainabilityTally {
  byRoute: RouteTally[];
  /** Units that did not go to destruction (every route except EPR recycling). */
  unitsKeptFromDestruction: number;
  rupeesSaved: number;
  /** Packaging kept in use or sent to EPR recycling instead of landfill. */
  packagingKg: number;
  /** Return pickups avoided: one per shop per day with a resolved line (not one per unit or per line). EPR recycling still needs a pickup. */
  reverseTripsAvoided: number;
  /** Only when L'Oréal-provided emission factors are configured; otherwise null (not shown). */
  co2Kg: number | null;
}

export function sustainabilityTally(
  resolutions: readonly Resolution[],
  cfg = THRESHOLDS,
): SustainabilityTally {
  const map = new Map<RecoveryRoute, RouteTally>();
  const pickups = new Set<string>();
  for (const r of resolutions) {
    const t = map.get(r.route) ?? { route: r.route, units: 0, rupeesSaved: 0, packagingKg: 0 };
    const grams = r.packagingGrams ?? cfg.sustainability.defaultPackagingGrams;
    t.units += r.units;
    t.rupeesSaved += r.units * r.unitPrice * cfg.recovery.valueFactor[r.route];
    t.packagingKg += (r.units * grams) / 1000;
    map.set(r.route, t);
    if (r.route !== 'epr_recycling') pickups.add(r.outletId && r.date ? `${r.outletId}|${r.date}` : `line-${pickups.size}`);
  }
  const trips = pickups.size;
  const byRoute = [...map.values()];
  const factor = cfg.sustainability.co2KgPerReverseTrip;
  return {
    byRoute,
    unitsKeptFromDestruction: byRoute.filter((t) => t.route !== 'epr_recycling').reduce((s, t) => s + t.units, 0),
    rupeesSaved: byRoute.reduce((s, t) => s + t.rupeesSaved, 0),
    packagingKg: byRoute.reduce((s, t) => s + t.packagingKg, 0),
    reverseTripsAvoided: trips,
    co2Kg: factor == null ? null : trips * factor,
  };
}

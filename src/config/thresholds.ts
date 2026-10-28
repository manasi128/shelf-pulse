/**
 * Every threshold the logic uses. All values are a PILOT PROPOSAL:
 * design starting points to be tuned in the 12-week pilot, not L'Oréal policy or benchmarks.
 *
 * The logic in /src/logic never hard-codes a number; it reads from here
 * (or from a config object passed in, which is how tests vary them).
 */
export const PILOT_PROPOSAL_LABEL = 'Pilot proposal';

export const THRESHOLDS = {
  forecast: {
    /** Weights for this visit's rate, the previous one, and the one before. */
    weights: [0.5, 0.3, 0.2] as readonly number[],
  },

  actBy: {
    /** Minimum shelf life the receiving outlet needs on arrival (days). */
    receiverMinShelfLifeDays: 60,
    /** Distributor transfer lead time (days). */
    transferLeadDays: 7,
  },

  status: {
    /** GREEN needs cover ≤ life − this many days. */
    greenLifeBufferDays: 30,
    /** GREEN needs cover ≤ this many days. */
    greenMaxCoverDays: 60,
    /** GREEN needs fewer than this many signals. */
    greenMaxSignalsExclusive: 2,
    /** RED when act-by is within this many days (or already passed). */
    redActByWithinDays: 30,
  },

  escalation: {
    /** Amber: area manager decides within (days). */
    amberDecideWithinDays: 7,
    /** Red: area manager + regional head choose a route within (hours). */
    redDecideWithinHours: 48,
    /** The same SKU red in at least this many outlets goes to the category team. */
    categoryReviewMinRedOutlets: 3,
  },

  playbook: {
    /** Amber stock may be moved only after the playbook has failed across this many visits. */
    moveAfterFailedVisits: 2,
  },

  transfer: {
    /** Minimum stock value per transfer (₹). Below this a move costs more than it recovers. */
    minValueRupees: 1500,
    /** Receiver must have sold the SKU in each of its last N visits. */
    receiverDemandVisits: 3,
    /** No transfer incentive on stock the same rep sold in within this many weeks. */
    noIncentiveIfSoldInWithinWeeks: 8,
  },

  ladder: {
    /** Transfer rung: life − transferLeadDays must be ≥ this (days). */
    transferMinLifeAfterLeadDays: 60,
    salonMinLifeDays: 20,
    b2bMinLifeDays: 45,
    staffSaleMinLifeDays: 30,
    donationMinLifeDays: 30,
  },

  order: {
    /** Suggested order = expected sales to next visit × this − stock (green SKUs). */
    safetyFactor: 1.25,
    /** Fast sellers are topped up to at most this many visits of demand. */
    fastSellerMaxVisitsOfDemand: 2,
    /** A SKU is a fast seller if its forecast rate is at least this (units/day), or it is a must-sell. */
    fastSellerMinRatePerDay: 1,
    /** Units suggested for a range gap the retailer asked for. */
    rangeGapStarterUnits: 3,
  },

  ranking: {
    /** Weights for ordering the day's beat by risk. */
    perRedLine: 100,
    perAmberLine: 30,
    perOpenFlag: 15,
    /** Points per ₹1,000 of stock at risk. */
    perThousandRupeesAtRisk: 1,
    /** Extra points per day an act-by date falls inside this window. */
    urgencyWindowDays: 30,
  },

  nudges: {
    /** "N batches reach act-by this week" looks this many days ahead. */
    actByLookaheadDays: 7,
  },

  brief: {
    /** Flag a SKU in the brief when it has not been reordered for this many visits. */
    notReorderedCycles: 2,
  },

  recovery: {
    /** Share of shelf value recovered on each rung, for "₹ saved from waste". */
    valueFactor: {
      sell_through: 1,
      transfer: 1,
      salon_backbar: 0.6,
      b2b_buyer: 0.4,
      staff_sale: 0.5,
      donation: 0,
      tester: 0,
      epr_recycling: 0,
    },
  },

  sustainability: {
    /** Default packaging weight when a SKU has none (grams per unit). */
    defaultPackagingGrams: 40,
    /**
     * kg CO₂e per reverse trip avoided. Null = not provided, so CO₂ is NOT shown.
     * Fill only with factors supplied by L'Oréal.
     */
    co2KgPerReverseTrip: null as number | null,
  },
};

export type Thresholds = typeof THRESHOLDS;

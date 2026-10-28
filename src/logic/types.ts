/** Calendar date as 'YYYY-MM-DD'. All date maths is in whole days, UTC. */
export type ISODate = string;

export type Status = 'green' | 'amber' | 'red';

export type SignalId =
  | 'dust_faded'
  | 'backroom_cartons'
  | 'no_facing'
  | 'discount_ask'
  | 'damaged_pack'
  /** AUTO: same batch code as last visit, with zero sales. */
  | 'same_batch_no_sales';

/** One stock count of one SKU at one outlet. */
export interface VisitCount {
  date: ISODate;
  /** Units the rep counted (shelf + backroom). */
  stock: number;
  /** Units delivered (from distributor billing) since the previous visit. */
  deliveredSincePrev: number;
  /** Batch code noted by the rep, if any. */
  batch?: string;
}

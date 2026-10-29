import type { AmberStep } from '../logic/playbook';
import type { RecoveryRoute } from '../logic/tally';
import type { ISODate, SignalId, Status, VisitCount } from '../logic/types';
import type { LangCode } from '../i18n';

export interface Sku {
  id: string;
  /** L'Oréal India brand name, used as text only. */
  brand: string;
  /** Example product description (fictional). */
  name: string;
  category: 'sun' | 'hair_pro' | 'lips' | 'gift' | 'face' | 'hair' | 'eyes';
  unitPrice: number;
  packagingGrams: number;
  professional: boolean;
  mustSell: boolean;
  hasMinis: boolean;
  /** Hero SKU to bundle with (sealed units only). */
  heroSkuId?: string;
  limitedEdition?: boolean;
  /** Display order (position in the seed). */
  sortIndex?: number;
}

export type OutletType = 'kirana' | 'cosmetic' | 'chemist';

export interface Outlet {
  id: string;
  name: string;
  type: OutletType;
  area: string;
  /** Position in the usual route (1 = first). */
  routeOrder: number;
  retailerLanguage: LangCode;
  /** Next existing distributor delivery run to this outlet. */
  nextRunDate: ISODate | null;
  /** Products the retailer asked for at the last visit (range gaps). */
  rangeAsks: string[];
  /** Days until the rep's next visit. */
  daysToNextVisit: number;
}

/** One SKU on one outlet's red list, with its visit history. */
export interface StockLine {
  id: string; // `${outletId}:${skuId}`
  outletId: string;
  skuId: string;
  batch: string;
  expiry: ISODate;
  /** Past visits, oldest → newest (not including today). */
  visits: VisitCount[];
  /** Units billed by the distributor since the last visit. */
  pendingDelivered: number;
  /** Signals ticked at the last visit (shown in the pre-visit brief). */
  lastSignals: SignalId[];
  /** Amber playbook steps tried, one array per past amber visit. */
  attempts: AmberStep[][];
  /** Units ordered at each visit, newest first. orders[0] is the "usual" order. */
  orders: number[];
  /** Weeks since this rep sold this stock in, if known. */
  weeksSinceSoldIn: number | null;
}

/** Today's in-progress visit at one outlet. Saved on every change. */
export interface VisitDraft {
  outletId: string;
  date: ISODate;
  counts: Record<string, { stock: number; batch?: string; source: 'photo' | 'scan' | 'manual' }>;
  signals: Record<string, SignalId[]>;
  answers: { rangeAsks?: string[]; notes?: string };
  /** Amber steps done in this visit. */
  stepsDone: Record<string, AmberStep[]>;
  startedAt: string;
  completedAt?: string;
}

export type FlagState = 'open' | 'approved' | 'declined' | 'resolved';

export interface Flag {
  id: string;
  outletId: string;
  skuId: string;
  status: Status;
  /**
   * What the rep proposes. Only moves that need a decision reach the manager: transfers and recovery routes.
   * Playbook steps in the shop (visibility, brief, bundle) are the rep's own call and never queue here.
   */
  proposal: { kind: 'route'; route: RecoveryRoute; receiverOutletId?: string; runDate?: ISODate; partnerId?: string };
  units: number;
  unitPrice: number;
  actBy: ISODate | null;
  raisedOn: ISODate;
  /** Decide by (from escalation rules). */
  decideBy: ISODate;
  state: FlagState;
  decidedOn?: ISODate;
  resolvedOn?: ISODate;
  note?: string;
}

export interface ResolutionRecord {
  id: string;
  flagId: string;
  outletId: string;
  skuId: string;
  route: RecoveryRoute;
  units: number;
  unitPrice: number;
  packagingGrams: number;
  date: ISODate;
}

export interface Partner {
  id: string;
  kind: 'salon' | 'academy' | 'b2b_buyer' | 'ngo';
  name: string;
  area: string;
}

export interface GodownBatch {
  id: string;
  skuId: string;
  batch: string;
  expiry: ISODate;
  units: number;
}

export interface Trends {
  weeks: ISODate[];
  returnExpiryRatePct: number[];
  controlReturnExpiryRatePct: number[];
  mustSellOsaPct: number[];
  primaryGrowthPct: number;
  secondaryGrowthPct: number;
  /** Territory sell-out value per week (₹), for rates. */
  weeklySalesValue: number[];
}

export interface DemoMeta {
  territory: string;
  repName: string;
  managerName: string;
  distributor: string;
  /** What the shelf-photo mock "sees" at each outlet. */
  photoCounts: Record<string, Record<string, { stock: number; batch: string; confidence: number }>>;
}

/** Everything the app holds, as plain objects. The derive layer works on this shape. */
export interface Dataset {
  skus: Sku[];
  outlets: Outlet[];
  lines: StockLine[];
  flags: Flag[];
  resolutions: ResolutionRecord[];
  partners: Partner[];
  godown: GodownBatch[];
  trends: Trends;
  meta: DemoMeta;
}

/**
 * AI features sit behind these interfaces. Each has a mock, so the app works fully
 * offline and without keys. AI suggests; the rep or manager decides. Every result
 * says where it came from and how sure it is.
 */
import type { SignalId } from '../logic/types';

/** off = rules and manual entry only; mock = offline demo AI; live = server route with a key. */
export type AiMode = 'off' | 'mock' | 'live';

/** Where a result came from. 'rules' = no AI involved. */
export type AiSource = 'live' | 'mock' | 'rules';

export interface ShelfReadingItem {
  skuId: string;
  stock: number;
  batch?: string;
  /** 0–1, shown to the rep. */
  confidence: number;
  source: AiSource;
}

export interface ShelfReader {
  /** Shelf photo → SKU counts and batch codes (OCR). */
  readShelf(input: { outletId: string; image?: Blob; skuIds: string[] }): Promise<ShelfReadingItem[]>;
  /** Close-up of a pack → batch code. */
  readBatchCode(input: { outletId: string; skuId: string; image?: Blob }): Promise<{ batch: string; confidence: number; source: AiSource }>;
}

export interface SkuRef {
  skuId: string;
  brand: string;
  name: string;
}

export interface VoiceExtraction {
  signals: { skuId: string; signal: SignalId; quote: string; confidence: number }[];
  rangeAsks: { skuId: string; quote: string; confidence: number }[];
  source: AiSource;
}

export interface VoiceExtractor {
  /** Transcript (any supported language) → structured signals and retailer asks. */
  extract(input: { transcript: string; language: string; redList: SkuRef[]; offList: SkuRef[] }): Promise<VoiceExtraction>;
}

export interface ActionCandidate {
  /** A ladder rung or playbook step id. */
  id: string;
  label: string;
  /** The rules' own pick (first eligible / next step). */
  isRuleChoice: boolean;
}

export interface NextActionInput {
  language: string;
  product: string;
  status: 'amber' | 'red';
  /** Plain facts the advisor may use: act-by, days left, sales, signals, receiver. */
  facts: string[];
  /** Only these may be chosen. The advisor never invents an action. */
  candidates: ActionCandidate[];
  /** The rules' one-line why, used when AI is off or unavailable. */
  ruleWhy: string;
}

export interface NextAction {
  choice: string;
  why: string;
  confidence: number;
  source: AiSource;
}

export interface Advisor {
  nextAction(input: NextActionInput): Promise<NextAction>;
}

export interface RetailerMessageInput {
  language: string;
  shop: string;
  repName: string;
  orderItems: string[];
  bundle?: { slow: string; hero: string };
  /** The template draft, used when AI is off or unavailable. */
  templateText: string;
}

export interface WeeklySummaryInput {
  language: string;
  facts: Record<string, string | number>;
  templateText: string;
}

export interface Writer {
  /** Retailer WhatsApp draft in the shop's language. The rep edits and sends it. */
  retailerMessage(input: RetailerMessageInput): Promise<{ text: string; source: AiSource }>;
  /** Manager's weekly summary in plain language. */
  weeklySummary(input: WeeklySummaryInput): Promise<{ text: string; source: AiSource }>;
}

export interface AiServices {
  mode: AiMode;
  shelf: ShelfReader | null;
  voice: VoiceExtractor | null;
  advisor: Advisor;
  writer: Writer;
}

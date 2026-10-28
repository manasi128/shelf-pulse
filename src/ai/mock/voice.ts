import type { SignalId } from '../../logic/types';
import type { SkuRef, VoiceExtraction, VoiceExtractor } from '../types';

/**
 * Offline extractor: finds products and signals by keyword, sentence by sentence,
 * in English, Hindi, Marathi, Tamil and Bengali. Deliberately simple; the live
 * extractor handles free speech. Each match carries the sentence it came from.
 */
const SKU_WORDS: Record<string, string[]> = {
  SUN: ['sunscreen', 'sun screen', 'spf', 'सनस्क्रीन', 'सन स्क्रीन', 'சன்ஸ்கிரீன்', 'সানস্ক্রিন'],
  SERUM: ['serum', 'सीरम', 'सिरम', 'சீரம்', 'সিরাম'],
  LIP: ['lipstick', 'लिपस्टिक', 'லிப்ஸ்டிக்', 'লিপস্টিক'],
  GIFT: ['gift set', 'gift', 'गिफ्ट', 'கிஃப்ட்', 'গিফট'],
  FACEWASH: ['face wash', 'facewash', 'फेस वॉश', 'फेसवॉश', 'ஃபேஸ் வாஷ்', 'ফেস ওয়াশ'],
  SHAMPOO: ['shampoo', 'शैम्पू', 'शॅम्पू', 'ஷாம்பு', 'শ্যাম্পু'],
  KAJAL: ['kajal', 'काजल', 'काजळ', 'காஜல்', 'কাজল'],
  MICELLAR: ['micellar', 'मिसेलर', 'மைசெல்லர்', 'মাইসেলার'],
  TINT: ['lip tint', 'tint', 'टिंट', 'டின்ட்', 'টিন্ট'],
};

const SIGNAL_WORDS: Record<Exclude<SignalId, 'same_batch_no_sales'>, string[]> = {
  backroom_cartons: ['carton', 'backroom', 'godown', 'कार्टन', 'गोदाम', 'खोके', 'அட்டைப்பெட்டி', 'பின்னறை', 'কার্টন', 'গুদাম'],
  discount_ask: ['discount', 'छूट', 'डिस्काउंट', 'सवलत', 'தள்ளுபடி', 'ছাড়'],
  dust_faded: ['dust', 'faded', 'धूल', 'फीका', 'धूळ', 'फिकट', 'தூசி', 'மங்கிய', 'ধুলো', 'ফিকে'],
  damaged_pack: ['damaged', 'torn', 'टूटा', 'फटा', 'फाटलेले', 'சேதம்', 'கிழிந்த', 'ফাটা', 'ছেঁড়া'],
  no_facing: ['no facing', 'pushed back', 'not visible', 'दिखता नहीं', 'दिसत नाही', 'தெரியவில்லை', 'দেখা যায় না'],
};

const ASK_WORDS = ['ask', 'want', 'पूछ', 'माँग', 'मांग', 'विचार', 'मागत', 'கேட்', 'চাইছ', 'চেয়েছ', 'জিজ্ঞেস'];

const SENTENCE_SPLIT = /[.!?।\n]+/;

function mentions(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((w) => lower.includes(w.toLowerCase()));
}

export function extractByKeywords(input: { transcript: string; redList: SkuRef[]; offList: SkuRef[] }): Omit<VoiceExtraction, 'source'> {
  const red = new Set(input.redList.map((s) => s.skuId));
  const off = new Set(input.offList.map((s) => s.skuId));
  const signals: VoiceExtraction['signals'] = [];
  const rangeAsks: VoiceExtraction['rangeAsks'] = [];

  for (const raw of input.transcript.split(SENTENCE_SPLIT)) {
    const quote = raw.trim();
    if (!quote) continue;
    // "lip tint" also contains "tint" but must not count as the lipstick.
    const skus = Object.keys(SKU_WORDS).filter((id) => (red.has(id) || off.has(id)) && mentions(quote, SKU_WORDS[id]));
    const found = (Object.keys(SIGNAL_WORDS) as (keyof typeof SIGNAL_WORDS)[]).filter((s) => mentions(quote, SIGNAL_WORDS[s]));
    const confidence = skus.length === 1 && found.length <= 1 ? 0.8 : 0.6;
    for (const skuId of skus) {
      if (red.has(skuId)) {
        for (const signal of found) signals.push({ skuId, signal, quote, confidence });
      } else if (mentions(quote, ASK_WORDS) || found.length === 0) {
        rangeAsks.push({ skuId, quote, confidence: 0.7 });
      }
    }
  }
  return { signals, rangeAsks };
}

export class MockVoiceExtractor implements VoiceExtractor {
  async extract(input: Parameters<VoiceExtractor['extract']>[0]): Promise<VoiceExtraction> {
    await new Promise((r) => setTimeout(r, 600));
    return { ...extractByKeywords(input), source: 'mock' };
  }
}

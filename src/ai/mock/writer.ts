import type { RetailerMessageInput, WeeklySummaryInput, Writer } from '../types';

/** Offline writer: returns the translated template drafts unchanged. */
export class TemplateWriter implements Writer {
  constructor(private source: 'mock' | 'rules' = 'rules') {}
  async retailerMessage(input: RetailerMessageInput) {
    return { text: input.templateText, source: this.source };
  }
  async weeklySummary(input: WeeklySummaryInput) {
    return { text: input.templateText, source: this.source };
  }
}

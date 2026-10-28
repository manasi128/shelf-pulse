import type { Advisor, NextAction, NextActionInput } from '../types';

/** Offline advisor: the playbook rules' own pick and why. Never anything else. */
export class RulesAdvisor implements Advisor {
  constructor(private source: 'mock' | 'rules' = 'rules') {}
  async nextAction(input: NextActionInput): Promise<NextAction> {
    const rule = input.candidates.find((c) => c.isRuleChoice) ?? input.candidates[0];
    return { choice: rule.id, why: input.ruleWhy, confidence: 1, source: this.source };
  }
}

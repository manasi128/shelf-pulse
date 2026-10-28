import { DEMO_TODAY } from '../../config/demo';
import { useDataset, useDrafts } from '../../data/hooks';

/** Live dataset and today's rep drafts, shared with the rep app on this device. */
export function useManager() {
  const data = useDataset();
  const drafts = useDrafts();
  if (!data || !drafts) return undefined;
  return { data, drafts, today: DEMO_TODAY };
}

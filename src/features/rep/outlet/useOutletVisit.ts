import { useParams } from 'react-router-dom';
import { DEMO_TODAY } from '../../../config/demo';
import { outletLines } from '../../../data/derive';
import { useDataset, useDrafts } from '../../../data/hooks';

/** Everything an outlet screen needs, live. Undefined while loading. */
export function useOutletVisit() {
  const { outletId } = useParams();
  const data = useDataset();
  const drafts = useDrafts();
  if (!data || !drafts) return undefined;
  const outlet = data.outlets.find((o) => o.id === outletId);
  if (!outlet) return null;
  return {
    data,
    drafts,
    outlet,
    draft: drafts[outlet.id],
    lines: outletLines(data, outlet.id, drafts, DEMO_TODAY),
    today: DEMO_TODAY,
  };
}

export type OutletVisit = NonNullable<ReturnType<typeof useOutletVisit>>;

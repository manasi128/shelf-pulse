import { useMemo } from 'react';
import { getAi } from './index';
import { useAiMode } from './settings';

/** The AI services for the current mode (off / demo / live). */
export function useAi() {
  const mode = useAiMode();
  return useMemo(() => getAi(mode), [mode]);
}

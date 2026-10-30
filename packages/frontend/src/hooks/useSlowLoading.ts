import { useEffect, useState } from 'react';

/**
 * Returns true once loading has continued for `delayMs`, so pages can show a
 * hint that the server may be waking up (the free host can take up to a
 * minute on the first request).
 */
export function useSlowLoading(isLoading: boolean, delayMs = 10000): boolean {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsSlow(false);
      return;
    }
    const timer = setTimeout(() => setIsSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [isLoading, delayMs]);

  return isSlow;
}

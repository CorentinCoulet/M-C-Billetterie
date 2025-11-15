"use client";

import { useEffect, useState } from 'react';

/**
 * Hook utilitaire pour détecter un viewport mobile
 * Par défaut, mobile si width <= 768px.
 */
export function useMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    // Init
    update();
    // Listen
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    } else if (typeof (mq as any).addListener === 'function') {
      (mq as any).addListener(update);
      return () => (mq as any).removeListener(update);
    }
  }, [breakpoint]);

  return isMobile;
}

export default useMobile;

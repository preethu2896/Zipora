'use client';

import { useEffect, useState } from 'react';

export const liveSponsorApi = process.env.NEXT_PUBLIC_SPONSOR_LIVE_API?.replace(/\/$/, '') || '';
export const sponsorApi = liveSponsorApi || process.env.NEXT_PUBLIC_SPONSOR_TEST_API?.replace(/\/$/, '') || '';

type FrameState = { number: number; state: 'held' | 'paid' }
  | { number: number; state: 'published'; brand: string; tagline: string; link: string; logo: string };

export function useSponsorAvailability() {
  const [availability, setAvailability] = useState<FrameState[]>();
  useEffect(() => {
    if (!sponsorApi) return;
    const controller = new AbortController();
    let refreshing = false;
    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        const response = await fetch(`${sponsorApi}/frames`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Could not check frame availability.');
        setAvailability(await response.json());
      } catch {
        if (!controller.signal.aborted) setAvailability(undefined);
      } finally {
        refreshing = false;
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);
  return availability;
}

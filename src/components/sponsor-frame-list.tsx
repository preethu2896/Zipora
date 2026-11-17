'use client';

import { sponsorApi, useSponsorAvailability } from './sponsor-availability';

export function SponsorFrameList() {
  const availability = useSponsorAvailability();
  const placements = availability?.filter(entry => entry.state === 'published') ?? [];
  if (!placements.length) return null;
  return <ul className="home-sponsors home-published-sponsors" aria-label="Sponsors">
    {placements.map(booking => {
      const destination = new URL(booking.link);
      destination.searchParams.set('ref', 'zipora');
      return <li key={booking.number}>
          <img src={sponsorApi + booking.logo} alt="" width={32} height={32} loading="lazy" />
          <a className="home-text-link" href={destination.href} target="_blank" rel="noopener noreferrer sponsored">{booking.brand}</a>
          <small>{booking.tagline}</small>
        </li>;
    })}
  </ul>;
}

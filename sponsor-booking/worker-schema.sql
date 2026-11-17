CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  frame INTEGER NOT NULL CHECK (frame BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'held',
  brand TEXT NOT NULL,
  tagline TEXT NOT NULL,
  link TEXT NOT NULL,
  email TEXT NOT NULL,
  notes TEXT NOT NULL,
  logo TEXT NOT NULL,
  extension TEXT NOT NULL,
  expires INTEGER NOT NULL,
  payment_id TEXT UNIQUE,
  notified INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS active_frame ON bookings (frame)
  WHERE status IN ('held', 'paid', 'published');
CREATE INDEX IF NOT EXISTS pending_notice ON bookings (notified) WHERE payment_id IS NOT NULL;

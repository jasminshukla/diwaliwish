-- Keep the earliest greeting-open for each session, then enforce it.
DELETE FROM events
WHERE event_type = 'greeting_opened'
  AND session_id IS NOT NULL
  AND wish_id IS NOT NULL
  AND rowid NOT IN (
    SELECT MIN(rowid) FROM events
    WHERE event_type = 'greeting_opened'
      AND session_id IS NOT NULL
      AND wish_id IS NOT NULL
    GROUP BY session_id, wish_id
  );

UPDATE wishes
SET view_count = (
  SELECT COUNT(*) FROM events
  WHERE events.wish_id = wishes.id AND events.event_type = 'greeting_opened'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_one_open
ON events (session_id, wish_id)
WHERE event_type = 'greeting_opened' AND session_id IS NOT NULL AND wish_id IS NOT NULL;

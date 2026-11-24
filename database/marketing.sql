CREATE TABLE IF NOT EXISTS marketing_events (id TEXT PRIMARY KEY, day TEXT NOT NULL DEFAULT (date('now')), browser TEXT NOT NULL, page TEXT NOT NULL, source TEXT NOT NULL, campaign TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('view','submission')));
CREATE INDEX IF NOT EXISTS marketing_day ON marketing_events(day);

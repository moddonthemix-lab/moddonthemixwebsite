CREATE TABLE IF NOT EXISTS project_finances (project_id TEXT PRIMARY KEY REFERENCES projects(id), quote_cents INTEGER NOT NULL DEFAULT 0 CHECK(quote_cents>=0), deadline TEXT);
CREATE TABLE IF NOT EXISTS payment_records (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), amount_cents INTEGER NOT NULL CHECK(amount_cents<>0), method TEXT NOT NULL, reference TEXT, received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS payment_project_idx ON payment_records(project_id);
CREATE INDEX IF NOT EXISTS payment_date_idx ON payment_records(received_at);
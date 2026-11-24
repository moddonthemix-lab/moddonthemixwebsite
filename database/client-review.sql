CREATE TABLE IF NOT EXISTS client_profiles (
 customer_id TEXT PRIMARY KEY REFERENCES customers(id),
 verified_email TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 disabled_at TEXT
);
CREATE TABLE IF NOT EXISTS client_sessions (
 token_hash TEXT PRIMARY KEY,
 customer_id TEXT NOT NULL REFERENCES client_profiles(customer_id),
 expires_at TEXT NOT NULL,
 revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS review_links (
 token_hash TEXT PRIMARY KEY,
 project_id TEXT NOT NULL REFERENCES projects(id),
 expires_at TEXT NOT NULL,
 revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS mix_versions (
 id TEXT PRIMARY KEY,
 project_id TEXT NOT NULL REFERENCES projects(id),
 version_number INTEGER NOT NULL CHECK(version_number >= 1),
 original_preview_key TEXT,
 mixed_preview_key TEXT NOT NULL,
 final_file_key TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(project_id,version_number)
);
CREATE TABLE IF NOT EXISTS mix_reviews (
 id TEXT PRIMARY KEY,
 version_id TEXT NOT NULL UNIQUE REFERENCES mix_versions(id),
 decision TEXT NOT NULL CHECK(decision IN ('approved','revision')),
 notes TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

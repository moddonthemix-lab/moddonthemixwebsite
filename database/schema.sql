PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS customers (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, artist_name TEXT NOT NULL, instagram TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS projects (
 id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id), service TEXT NOT NULL CHECK(service IN ('mixing','mastering','mix-master','custom')), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','uploading','submitted','in_progress','revision','delivered','cancelled')), payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid','refunded')), notes TEXT, reference_url TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS project_files (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), object_key TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL, size_bytes INTEGER NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 5000000000), status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','uploading','uploaded','deleted','failed')), multipart_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TEXT NOT NULL, deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS upload_authorizations (
 token_hash TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), expires_at TEXT NOT NULL, revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS project_customer_idx ON projects(customer_id);
CREATE INDEX IF NOT EXISTS file_project_idx ON project_files(project_id);
CREATE INDEX IF NOT EXISTS file_expiry_idx ON project_files(status,expires_at);
CREATE TRIGGER IF NOT EXISTS file_reservation_limit BEFORE INSERT ON project_files WHEN NEW.status IN ('reserved','uploading','uploaded') BEGIN
 SELECT CASE WHEN NEW.size_bytes + COALESCE((SELECT SUM(size_bytes) FROM project_files WHERE project_id=NEW.project_id AND status IN ('reserved','uploading','uploaded')),0)>5000000000 THEN RAISE(ABORT,'Project storage limit exceeded') END;
 SELECT CASE WHEN NEW.size_bytes + COALESCE((SELECT SUM(size_bytes) FROM project_files WHERE status IN ('reserved','uploading','uploaded')),0)>9000000000 THEN RAISE(ABORT,'Storage capacity reached') END;
END;
CREATE TRIGGER IF NOT EXISTS file_reservation_update_limit BEFORE UPDATE OF size_bytes,status,project_id ON project_files WHEN NEW.status IN ('reserved','uploading','uploaded') BEGIN
 SELECT CASE WHEN NEW.size_bytes + COALESCE((SELECT SUM(size_bytes) FROM project_files WHERE id<>OLD.id AND project_id=NEW.project_id AND status IN ('reserved','uploading','uploaded')),0)>5000000000 THEN RAISE(ABORT,'Project storage limit exceeded') END;
 SELECT CASE WHEN NEW.size_bytes + COALESCE((SELECT SUM(size_bytes) FROM project_files WHERE id<>OLD.id AND status IN ('reserved','uploading','uploaded')),0)>9000000000 THEN RAISE(ABORT,'Storage capacity reached') END;
END;

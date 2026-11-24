CREATE TABLE IF NOT EXISTS template_products (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents>=0),
 active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)), object_key TEXT, requirements TEXT
);
INSERT OR IGNORE INTO template_products(id,title,price_cents) VALUES
 ('starter','MODD Starter',0),('essentials','MODD Essentials',3999),('signature','MODD Signature',9999),('elite','MODD Elite',14999),('custom','MODD Custom',24999);
CREATE TABLE IF NOT EXISTS template_orders (
 id TEXT PRIMARY KEY, email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','fulfilled','cancelled','refunded')),
 total_cents INTEGER NOT NULL CHECK(total_cents>=0), stripe_session_id TEXT UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS template_order_items (
 order_id TEXT NOT NULL REFERENCES template_orders(id), product_id TEXT NOT NULL REFERENCES template_products(id),
 price_cents INTEGER NOT NULL CHECK(price_cents>=0), PRIMARY KEY(order_id,product_id)
);
CREATE TABLE IF NOT EXISTS template_download_grants (
 token_hash TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES template_orders(id), product_id TEXT NOT NULL REFERENCES template_products(id),
 expires_at TEXT NOT NULL, revoked_at TEXT
);
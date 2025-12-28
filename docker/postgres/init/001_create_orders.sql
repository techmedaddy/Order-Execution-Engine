CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  base_token TEXT NOT NULL,
  quote_token TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);


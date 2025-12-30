CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,

  base_token TEXT NOT NULL,
  quote_token TEXT NOT NULL,
  amount NUMERIC NOT NULL,

  -- REQUIRED by OrderPayload
  type TEXT NOT NULL,

  status TEXT NOT NULL,

  -- Idempotency guarantee
  idempotency_key TEXT NOT NULL UNIQUE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

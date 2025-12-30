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

-- Helpful indexes (optional but correct)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

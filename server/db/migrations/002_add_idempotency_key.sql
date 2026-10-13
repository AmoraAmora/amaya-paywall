-- Lets clients safely retry POST /api/purchase: one key → at most one purchase.
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS idempotency_key text;

-- NULLs don't collide, so purchases created without a key are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS purchases_idempotency_key_key
  ON purchases (idempotency_key);

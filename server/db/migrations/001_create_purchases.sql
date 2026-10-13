-- Test purchases made from the paywall.
CREATE TABLE IF NOT EXISTS purchases (
  id          uuid        PRIMARY KEY,
  offer_id    text        NOT NULL,
  device_id   uuid        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- "Restore purchases" looks up the latest purchases of a device.
CREATE INDEX IF NOT EXISTS purchases_device_id_created_at_idx
  ON purchases (device_id, created_at DESC);

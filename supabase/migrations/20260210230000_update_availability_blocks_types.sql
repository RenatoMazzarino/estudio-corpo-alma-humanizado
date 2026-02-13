-- Atualiza availability_blocks para suportar gestão inteligente de disponibilidade
ALTER TABLE availability_blocks
  ADD COLUMN IF NOT EXISTS block_type TEXT,
  ADD COLUMN IF NOT EXISTS is_full_day BOOLEAN DEFAULT false;

-- Backfill para registros existentes (antigos bloqueios de plantão)
UPDATE availability_blocks
SET block_type = COALESCE(block_type, 'shift'),
    is_full_day = COALESCE(is_full_day, true);

ALTER TABLE availability_blocks
  ALTER COLUMN block_type SET DEFAULT 'personal',
  ALTER COLUMN block_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'availability_blocks_type_check'
  ) THEN
    ALTER TABLE availability_blocks
      ADD CONSTRAINT availability_blocks_type_check
      CHECK (block_type IN ('shift', 'personal', 'vacation', 'administrative'));
  END IF;
END $$;

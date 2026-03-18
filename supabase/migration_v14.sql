-- Migration v14: Piece retirement / soft delete
-- Adds status field and departure tracking to pieces

ALTER TABLE pieces ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE pieces ADD COLUMN IF NOT EXISTS date_departed date;
ALTER TABLE pieces ADD COLUMN IF NOT EXISTS sale_price numeric;
ALTER TABLE pieces ADD COLUMN IF NOT EXISTS departed_to text;

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_pieces_status ON pieces(status);

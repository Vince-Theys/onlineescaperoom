-- Room customization: per-level metadata on question, variable level count on escape_room.
-- Nullable columns on question fall back to floorConstants.ts defaults when NULL.
-- No RLS changes needed — new columns inherit existing table-level policies.

ALTER TABLE question
  ADD COLUMN IF NOT EXISTS room_name  TEXT,
  ADD COLUMN IF NOT EXISTS room_theme TEXT,
  ADD COLUMN IF NOT EXISTS room_icon  TEXT,
  ADD COLUMN IF NOT EXISTS room_tint  TEXT;

ALTER TABLE escape_room
  ADD COLUMN IF NOT EXISTS level_count INTEGER NOT NULL DEFAULT 5
    CHECK (level_count BETWEEN 1 AND 10);

-- Migration: add tutor profile availability flag
-- Date: 2026-07-09

ALTER TABLE tutor_profiles
  ADD COLUMN IF NOT EXISTS is_available TINYINT(1) NOT NULL DEFAULT 1 AFTER status;

-- Down: remove tutor profile availability flag
ALTER TABLE tutor_profiles
  DROP COLUMN IF EXISTS is_available;

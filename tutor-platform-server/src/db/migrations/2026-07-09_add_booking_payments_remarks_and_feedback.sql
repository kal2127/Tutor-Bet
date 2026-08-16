-- Migration: add remarks to booking_payments and create feedback table
-- Date: 2026-07-09
-- Up: apply changes
ALTER TABLE booking_payments
  ADD COLUMN IF NOT EXISTS remarks VARCHAR(255) NULL;

CREATE TABLE IF NOT EXISTS feedback (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  role ENUM('FAMILY','TUTOR') NOT NULL,
  rating TINYINT NOT NULL,
  comments TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_feedback_booking (booking_id),
  KEY idx_feedback_author (author_id),

  CONSTRAINT fk_feedback_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_feedback_author
    FOREIGN KEY (author_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- Down: revert changes
DROP TABLE IF EXISTS feedback;

ALTER TABLE booking_payments
  DROP COLUMN IF EXISTS remarks;
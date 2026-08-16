-- Allow site-wide feedback that is not tied to a booking or signed-in user.

ALTER TABLE feedback
  DROP FOREIGN KEY fk_feedback_booking;

ALTER TABLE feedback
  DROP FOREIGN KEY fk_feedback_author;

ALTER TABLE feedback
  MODIFY booking_id BIGINT UNSIGNED NULL,
  MODIFY author_id BIGINT UNSIGNED NULL,
  MODIFY role ENUM('FAMILY','TUTOR','VISITOR') NOT NULL DEFAULT 'VISITOR';

ALTER TABLE feedback
  ADD CONSTRAINT fk_feedback_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ON DELETE SET NULL;

ALTER TABLE feedback
  ADD CONSTRAINT fk_feedback_author
    FOREIGN KEY (author_id) REFERENCES users(id)
    ON DELETE SET NULL;

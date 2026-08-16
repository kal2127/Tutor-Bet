-- Migration: add composite indexes for common filters and status lookups
-- Date: 2026-07-09

ALTER TABLE tutor_profiles
  ADD INDEX idx_tutor_profiles_status_is_available (status, is_available);

ALTER TABLE bookings
  ADD INDEX idx_bookings_status_created_at (status, created_at),
  ADD INDEX idx_bookings_family_status_created_at (family_id, status, created_at),
  ADD INDEX idx_bookings_tutor_status_created_at (tutor_id, status, created_at);

ALTER TABLE booking_payments
  ADD INDEX idx_booking_payments_status_created_at (status, created_at);

ALTER TABLE tutor_job_posts
  ADD INDEX idx_tutor_job_posts_family_status (family_id, status),
  ADD INDEX idx_tutor_job_posts_status_created_at (status, created_at);

ALTER TABLE tutor_job_applications
  ADD INDEX idx_tutor_job_applications_job_post_id (job_post_id),
  ADD INDEX idx_tutor_job_applications_tutor_status (tutor_id, status);

-- Down: remove the indexes
ALTER TABLE tutor_job_applications
  DROP INDEX idx_tutor_job_applications_tutor_status,
  DROP INDEX idx_tutor_job_applications_job_post_id;

ALTER TABLE tutor_job_posts
  DROP INDEX idx_tutor_job_posts_status_created_at,
  DROP INDEX idx_tutor_job_posts_family_status;

ALTER TABLE booking_payments
  DROP INDEX idx_booking_payments_status_created_at;

ALTER TABLE bookings
  DROP INDEX idx_bookings_tutor_status_created_at,
  DROP INDEX idx_bookings_family_status_created_at,
  DROP INDEX idx_bookings_status_created_at;

ALTER TABLE tutor_profiles
  DROP INDEX idx_tutor_profiles_status_is_available;
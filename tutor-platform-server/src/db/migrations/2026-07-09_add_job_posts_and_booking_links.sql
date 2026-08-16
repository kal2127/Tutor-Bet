-- Migration: add family job posts, tutor applications, and booking links
-- Date: 2026-07-09

CREATE TABLE IF NOT EXISTS tutor_job_posts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  family_id BIGINT UNSIGNED NOT NULL,
  selected_tutor_id BIGINT UNSIGNED NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  student_name VARCHAR(120) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  curriculum VARCHAR(100) NOT NULL,
  subject VARCHAR(100) NULL,
  location_note VARCHAR(200) NULL,
  session_type ENUM('ONLINE','IN_PERSON') NOT NULL DEFAULT 'ONLINE',
  days_per_week INT NOT NULL,
  hours_per_day INT NOT NULL,
  budget DECIMAL(10,2) NULL,
  status ENUM('OPEN','FULFILLED','CLOSED') NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_tutor_job_posts_selected_tutor (selected_tutor_id),

  CONSTRAINT fk_tutor_job_posts_family
    FOREIGN KEY (family_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_tutor_job_posts_selected_tutor
    FOREIGN KEY (selected_tutor_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tutor_job_applications (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  job_post_id BIGINT UNSIGNED NOT NULL,
  tutor_id BIGINT UNSIGNED NOT NULL,
  message TEXT NULL,
  proposed_rate DECIMAL(10,2) NULL,
  status ENUM('APPLIED','ACCEPTED','REJECTED') NOT NULL DEFAULT 'APPLIED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_tutor_job_applications_job_tutor (job_post_id, tutor_id),

  CONSTRAINT fk_tutor_job_applications_job
    FOREIGN KEY (job_post_id) REFERENCES tutor_job_posts(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_tutor_job_applications_tutor
    FOREIGN KEY (tutor_id) REFERENCES users(id)
    ON DELETE CASCADE
);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS job_post_id BIGINT UNSIGNED NULL AFTER tutor_id,
  MODIFY COLUMN start_time DATETIME NULL,
  MODIFY COLUMN end_time DATETIME NULL,
  ADD INDEX idx_bookings_job_post (job_post_id),
  ADD CONSTRAINT fk_bookings_job_post
    FOREIGN KEY (job_post_id) REFERENCES tutor_job_posts(id)
    ON DELETE SET NULL;

-- Down: remove booking links and job-post tables
ALTER TABLE bookings
  DROP FOREIGN KEY fk_bookings_job_post,
  DROP INDEX idx_bookings_job_post,
  DROP COLUMN IF EXISTS job_post_id,
  MODIFY COLUMN start_time DATETIME NOT NULL,
  MODIFY COLUMN end_time DATETIME NOT NULL;

DROP TABLE IF EXISTS tutor_job_applications;
DROP TABLE IF EXISTS tutor_job_posts;

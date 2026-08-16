-- Tutor Platform Database Schema (Phase 1)
-- MySQL 8+

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  role ENUM('ADMIN','FAMILY','TUTOR') NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  google_sub VARCHAR(120) NULL,
  auth_provider ENUM('PASSWORD','GOOGLE') NOT NULL DEFAULT 'PASSWORD',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_google_sub (google_sub)
);

-- Tutor profile (1-to-1 with users where role='TUTOR')
CREATE TABLE IF NOT EXISTS tutor_profiles (
  tutor_id BIGINT UNSIGNED PRIMARY KEY,
  bio TEXT NULL,
  location_city VARCHAR(80) NULL,
  location_area VARCHAR(80) NULL,
  education VARCHAR(150) NULL,
  experience_years INT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_tutor_profiles_status_is_available (status, is_available),

  CONSTRAINT fk_tutor_profiles_user
    FOREIGN KEY (tutor_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- Tutor billing status (registration + renewal every 6 months)
CREATE TABLE IF NOT EXISTS tutor_billing (
  tutor_id BIGINT UNSIGNED PRIMARY KEY,
  registration_paid TINYINT(1) NOT NULL DEFAULT 0,
  next_renewal_date DATE NULL,
  billing_status ENUM('ACTIVE','PAST_DUE','SUSPENDED') NOT NULL DEFAULT 'SUSPENDED',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_tutor_billing_user
    FOREIGN KEY (tutor_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- Payments made by tutors (registration/renewal)
CREATE TABLE IF NOT EXISTS tutor_payments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tutor_id BIGINT UNSIGNED NOT NULL,
  type ENUM('REGISTRATION','RENEWAL') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
  provider VARCHAR(40) NULL,
  provider_ref VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_tutor_payments_tutor (tutor_id),
  KEY idx_tutor_payments_status (status),

  CONSTRAINT fk_tutor_payments_user
    FOREIGN KEY (tutor_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- Private tutor application details visible to admins during approval
CREATE TABLE IF NOT EXISTS tutor_application_details (
  tutor_id BIGINT UNSIGNED PRIMARY KEY,
  gender VARCHAR(30) NULL,
  employment_status VARCHAR(40) NULL,
  organization VARCHAR(150) NULL,
  grade_levels JSON NULL,
  hourly_rates_by_grade JSON NULL,
  subjects JSON NULL,
  languages JSON NULL,
  curriculum_options JSON NULL,
  has_tempo TINYINT(1) NOT NULL DEFAULT 0,
  cgpa DECIMAL(4,2) NULL,
  profile_photo_url VARCHAR(255) NULL,
  certification_urls JSON NULL,
  fayda_id_url VARCHAR(255) NULL,
  highschool_transcript_url VARCHAR(255) NULL,
  tempo_url VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_tutor_application_details_tutor
    FOREIGN KEY (tutor_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- Job posts created by families for tutors to apply to
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
  request_payment_amount DECIMAL(10,2) NULL,
  request_payment_receipt_url VARCHAR(255) NULL,
  request_payment_transaction_ref VARCHAR(120) NULL,
  status ENUM('PENDING_APPROVAL','OPEN','REJECTED','FULFILLED','CLOSED') NOT NULL DEFAULT 'PENDING_APPROVAL',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  approved_by BIGINT UNSIGNED NULL,

  KEY idx_tutor_job_posts_family_status (family_id, status),
  KEY idx_tutor_job_posts_status_created_at (status, created_at),
  KEY idx_tutor_job_posts_selected_tutor (selected_tutor_id),
  KEY idx_tutor_job_posts_pending_approval (status, created_at),

  CONSTRAINT fk_tutor_job_posts_family
    FOREIGN KEY (family_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_tutor_job_posts_selected_tutor
    FOREIGN KEY (selected_tutor_id) REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_tutor_job_posts_approved_by
    FOREIGN KEY (approved_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- Tutor applications for family job posts
CREATE TABLE IF NOT EXISTS tutor_job_applications (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  job_post_id BIGINT UNSIGNED NOT NULL,
  tutor_id BIGINT UNSIGNED NOT NULL,
  message TEXT NULL,
  proposed_rate DECIMAL(10,2) NULL,
  status ENUM('APPLIED','ACCEPTED','REJECTED') NOT NULL DEFAULT 'APPLIED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_tutor_job_applications_job_tutor (job_post_id, tutor_id),
  KEY idx_tutor_job_applications_job_post_id (job_post_id),
  KEY idx_tutor_job_applications_tutor_status (tutor_id, status),

  CONSTRAINT fk_tutor_job_applications_job
    FOREIGN KEY (job_post_id) REFERENCES tutor_job_posts(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_tutor_job_applications_tutor
    FOREIGN KEY (tutor_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- Bookings created by families with tutors
CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  family_id BIGINT UNSIGNED NOT NULL,
  tutor_id BIGINT UNSIGNED NOT NULL,
  job_post_id BIGINT UNSIGNED NULL,
  student_name VARCHAR(120) NULL,
  grade VARCHAR(50) NULL,
  curriculum VARCHAR(100) NULL,
  days_per_week INT NULL,
  hours_per_day INT NULL,
  start_time DATETIME NULL,
  end_time DATETIME NULL,
  session_type ENUM('ONLINE','IN_PERSON') NOT NULL DEFAULT 'ONLINE',
  location_note VARCHAR(200) NULL,
  status ENUM('PENDING_PAYMENT','PENDING_VERIFICATION','CONFIRMED','PAYMENT_REJECTED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'PENDING_PAYMENT',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_bookings_tutor_time (tutor_id, start_time),
  KEY idx_bookings_family (family_id),
  KEY idx_bookings_job_post (job_post_id),
  KEY idx_bookings_status (status),
  KEY idx_bookings_family_status (family_id, status),
  KEY idx_bookings_tutor_status (tutor_id, status),
  KEY idx_bookings_status_created_at (status, created_at),
  KEY idx_bookings_family_status_created_at (family_id, status, created_at),
  KEY idx_bookings_tutor_status_created_at (tutor_id, status, created_at),

  CONSTRAINT fk_bookings_family
    FOREIGN KEY (family_id) REFERENCES users(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_bookings_tutor
    FOREIGN KEY (tutor_id) REFERENCES users(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_bookings_job_post
    FOREIGN KEY (job_post_id) REFERENCES tutor_job_posts(id)
    ON DELETE SET NULL
);

-- Payment for booking (pay-per-booking)
CREATE TABLE IF NOT EXISTS booking_payments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING','PAID','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  receipt_url VARCHAR(255) NULL,
  transaction_ref VARCHAR(120) NULL,
  remarks VARCHAR(255) NULL,
  provider VARCHAR(40) NULL,
  provider_ref VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_booking_payments_booking (booking_id),
  KEY idx_booking_payments_status (status),
  KEY idx_booking_payments_status_created_at (status, created_at),

  CONSTRAINT fk_booking_payments_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ON DELETE CASCADE
);

-- Feedback left by families or tutors about a booking
CREATE TABLE IF NOT EXISTS feedback (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NULL,
  author_id BIGINT UNSIGNED NULL,
  role ENUM('FAMILY','TUTOR','VISITOR') NOT NULL DEFAULT 'VISITOR',
  rating TINYINT NOT NULL,
  comments TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_feedback_booking (booking_id),
  KEY idx_feedback_author (author_id),

  CONSTRAINT fk_feedback_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_feedback_author
    FOREIGN KEY (author_id) REFERENCES users(id)
    ON DELETE SET NULL
);

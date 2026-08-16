CREATE TABLE IF NOT EXISTS tutor_application_details (
  tutor_id BIGINT UNSIGNED PRIMARY KEY,
  gender VARCHAR(30) NULL,
  employment_status VARCHAR(40) NULL,
  organization VARCHAR(150) NULL,
  grade_levels JSON NULL,
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

ALTER TABLE users
  ADD COLUMN google_sub VARCHAR(120) NULL,
  ADD COLUMN auth_provider ENUM('PASSWORD','GOOGLE') NOT NULL DEFAULT 'PASSWORD',
  ADD UNIQUE KEY uq_users_google_sub (google_sub);

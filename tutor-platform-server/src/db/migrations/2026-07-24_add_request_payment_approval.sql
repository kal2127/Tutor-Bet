ALTER TABLE tutor_job_posts
  MODIFY status ENUM('PENDING_APPROVAL','OPEN','REJECTED','FULFILLED','CLOSED') NOT NULL DEFAULT 'PENDING_APPROVAL',
  ADD COLUMN request_payment_amount DECIMAL(10,2) NULL AFTER budget,
  ADD COLUMN request_payment_receipt_url VARCHAR(255) NULL AFTER request_payment_amount,
  ADD COLUMN request_payment_transaction_ref VARCHAR(120) NULL AFTER request_payment_receipt_url,
  ADD COLUMN approved_at TIMESTAMP NULL AFTER created_at,
  ADD COLUMN approved_by BIGINT UNSIGNED NULL AFTER approved_at,
  ADD INDEX idx_tutor_job_posts_pending_approval (status, created_at),
  ADD CONSTRAINT fk_tutor_job_posts_approved_by
    FOREIGN KEY (approved_by) REFERENCES users(id)
    ON DELETE SET NULL;

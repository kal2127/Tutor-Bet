require("dotenv").config();

const mysql = require("mysql2/promise");

async function main() {
  const db = process.env.DB_NAME;
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: db,
  });

  const [cols] = await conn.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
    [db, "tutor_job_posts"],
  );
  const hasColumn = new Set(cols.map((col) => col.COLUMN_NAME));

  const alters = [
    "MODIFY status ENUM('PENDING_APPROVAL','OPEN','REJECTED','FULFILLED','CLOSED') NOT NULL DEFAULT 'PENDING_APPROVAL'",
  ];

  if (!hasColumn.has("request_payment_amount")) {
    alters.push("ADD COLUMN request_payment_amount DECIMAL(10,2) NULL AFTER budget");
  }
  if (!hasColumn.has("request_payment_receipt_url")) {
    alters.push("ADD COLUMN request_payment_receipt_url VARCHAR(255) NULL AFTER request_payment_amount");
  }
  if (!hasColumn.has("request_payment_transaction_ref")) {
    alters.push("ADD COLUMN request_payment_transaction_ref VARCHAR(120) NULL AFTER request_payment_receipt_url");
  }
  if (!hasColumn.has("approved_at")) {
    alters.push("ADD COLUMN approved_at TIMESTAMP NULL AFTER created_at");
  }
  if (!hasColumn.has("approved_by")) {
    alters.push("ADD COLUMN approved_by BIGINT UNSIGNED NULL AFTER approved_at");
  }

  await conn.query(`ALTER TABLE tutor_job_posts ${alters.join(", ")}`);

  const [indexes] = await conn.query(
    "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
    [db, "tutor_job_posts"],
  );
  const hasIndex = new Set(indexes.map((idx) => idx.INDEX_NAME));

  if (!hasIndex.has("idx_tutor_job_posts_pending_approval")) {
    await conn.query(
      "ALTER TABLE tutor_job_posts ADD INDEX idx_tutor_job_posts_pending_approval (status, created_at)",
    );
  }

  const [constraints] = await conn.query(
    "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
    [db, "tutor_job_posts"],
  );
  const hasConstraint = new Set(
    constraints.map((constraint) => constraint.CONSTRAINT_NAME),
  );

  if (!hasConstraint.has("fk_tutor_job_posts_approved_by")) {
    await conn.query(
      "ALTER TABLE tutor_job_posts ADD CONSTRAINT fk_tutor_job_posts_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL",
    );
  }

  await conn.end();
  console.log("Request approval migration applied.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

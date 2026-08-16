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

  try {
    const [columnsBefore] = await conn.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'feedback'`,
      [db],
    );
    const columnNames = new Set(columnsBefore.map((column) => column.COLUMN_NAME));

    const [foreignKeys] = await conn.query(
      `SELECT CONSTRAINT_NAME
       FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = ?
         AND TABLE_NAME = 'feedback'`,
      [db],
    );

    for (const foreignKey of foreignKeys) {
      await conn.query(
        `ALTER TABLE feedback DROP FOREIGN KEY ${foreignKey.CONSTRAINT_NAME}`,
      );
    }

    if (!columnNames.has("author_id")) {
      await conn.query(
        "ALTER TABLE feedback ADD COLUMN author_id BIGINT UNSIGNED NULL AFTER booking_id",
      );
    }

    if (!columnNames.has("role")) {
      await conn.query(
        "ALTER TABLE feedback ADD COLUMN role ENUM('FAMILY','TUTOR','VISITOR') NOT NULL DEFAULT 'VISITOR' AFTER author_id",
      );
    }

    if (!columnNames.has("comments")) {
      await conn.query("ALTER TABLE feedback ADD COLUMN comments TEXT NULL AFTER rating");
    }

    await conn.query("ALTER TABLE feedback MODIFY booking_id BIGINT UNSIGNED NULL");
    await conn.query("ALTER TABLE feedback MODIFY author_id BIGINT UNSIGNED NULL");
    await conn.query(
      "ALTER TABLE feedback MODIFY role ENUM('FAMILY','TUTOR','VISITOR') NOT NULL DEFAULT 'VISITOR'",
    );

    if (columnNames.has("tutor_id")) {
      await conn.query("ALTER TABLE feedback MODIFY tutor_id BIGINT UNSIGNED NULL");
    }

    if (columnNames.has("family_id")) {
      await conn.query("ALTER TABLE feedback MODIFY family_id BIGINT UNSIGNED NULL");
    }

    if (columnNames.has("comment")) {
      await conn.query(
        "UPDATE feedback SET comments = COALESCE(comments, comment) WHERE comment IS NOT NULL",
      );
    }

    if (columnNames.has("family_id")) {
      await conn.query(
        "UPDATE feedback SET author_id = family_id, role = 'FAMILY' WHERE author_id IS NULL AND family_id IS NOT NULL",
      );
    }

    if (columnNames.has("tutor_id")) {
      await conn.query(
        "UPDATE feedback SET author_id = tutor_id, role = 'TUTOR' WHERE author_id IS NULL AND tutor_id IS NOT NULL",
      );
    }

    await conn.query(`
      ALTER TABLE feedback
        ADD CONSTRAINT fk_feedback_booking
          FOREIGN KEY (booking_id) REFERENCES bookings(id)
          ON DELETE SET NULL
    `);

    await conn.query(`
      ALTER TABLE feedback
        ADD CONSTRAINT fk_feedback_author
          FOREIGN KEY (author_id) REFERENCES users(id)
          ON DELETE SET NULL
    `);

    const [columns] = await conn.query(
      `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'feedback'
         AND COLUMN_NAME IN ('booking_id', 'author_id', 'role')
       ORDER BY COLUMN_NAME`,
      [db],
    );

    console.log("Public feedback migration applied.");
    console.table(columns);
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

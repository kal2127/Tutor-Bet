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
    const [columns] = await conn.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'tutor_application_details'`,
      [db],
    );
    const columnNames = new Set(columns.map((column) => column.COLUMN_NAME));

    if (!columnNames.has("hourly_rates_by_grade")) {
      await conn.query(
        "ALTER TABLE tutor_application_details ADD COLUMN hourly_rates_by_grade JSON NULL AFTER grade_levels",
      );
    }

    const [result] = await conn.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'tutor_application_details'
         AND COLUMN_NAME = 'hourly_rates_by_grade'`,
      [db],
    );

    console.log("Tutor grade pricing migration applied.");
    console.table(result);
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

const { query } = require("../../db/query");
const HttpError = require("../../utils/httpError");

async function createFeedback(authorId, role, bookingId, data) {
  if (bookingId) {
    const rows = await query("SELECT status FROM bookings WHERE id = ?", [
      bookingId,
    ]);

    if (rows.length === 0) throw new HttpError(404, "Booking not found");

    if (rows[0].status !== "COMPLETED") {
      throw new HttpError(400, "Feedback allowed only for completed bookings");
    }

    if (authorId) {
      const existing = await query(
        "SELECT id FROM feedback WHERE booking_id = ? AND author_id = ?",
        [bookingId, authorId],
      );

      if (existing.length) throw new HttpError(409, "Feedback already submitted");
    }
  }

  const result = await query(
    `INSERT INTO feedback (booking_id, author_id, role, rating, comments)
     VALUES (?, ?, ?, ?, ?)`,
    [bookingId || null, authorId || null, role, data.rating, data.comments || null],
  );

  return { feedbackId: result.insertId };
}

async function getAllFeedback() {
  const columns = await query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'feedback'`,
  );
  const columnNames = new Set(columns.map((column) => column.COLUMN_NAME));

  if (!columnNames.has("author_id")) {
    return await query(
      `SELECT
          f.id,
          f.booking_id,
          COALESCE(f.family_id, f.tutor_id) AS author_id,
          CASE WHEN f.family_id IS NOT NULL THEN 'FAMILY' ELSE 'TUTOR' END AS role,
          f.rating,
          f.comment AS comments,
          f.created_at,
          COALESCE(family.full_name, tutor.full_name) AS author_name
       FROM feedback f
       LEFT JOIN users family ON family.id = f.family_id
       LEFT JOIN users tutor ON tutor.id = f.tutor_id
       ORDER BY f.created_at DESC`,
    );
  }

  return await query(
    `SELECT f.id, f.booking_id, f.author_id, f.role, f.rating, f.comments, f.created_at,
            COALESCE(u.full_name, 'Visitor') AS author_name
     FROM feedback f
     LEFT JOIN users u ON u.id = f.author_id
     ORDER BY f.created_at DESC`,
  );
}

async function deleteFeedback(feedbackId) {
  const rows = await query("SELECT id FROM feedback WHERE id = ?", [
    feedbackId,
  ]);
  if (!rows.length) throw new HttpError(404, "Feedback not found");

  await query("DELETE FROM feedback WHERE id = ?", [feedbackId]);
  return { feedbackId };
}

module.exports = { createFeedback, getAllFeedback, deleteFeedback };

const { query } = require("../db/query");
const HttpError = require("../utils/httpError");

async function createPayment(jobId, studentId, transactionId, receiptImage) {
  // 1. Check the job belongs to this family

  const jobs = await query(
    `SELECT *
         FROM jobs
         WHERE id = ?
         AND student_id = ?`,
    [jobId, studentId],
  );

  if (jobs.length === 0) throw new HttpError(404, "Job not found");

  const job = jobs[0];

  // 2. Prevent duplicate payment

  const existing = await query(
    `SELECT id
         FROM payments
         WHERE job_id = ?`,
    [jobId],
  );

  if (existing.length > 0) throw new HttpError(400, "Payment already exists");

  // 3. Create payment

  const result = await query(
    `INSERT INTO payments
(
    job_id,
    student_id,
    tutor_id,
    transaction_id,
    receipt_image,
    status
)
VALUES
(
    ?, ?, ?, ?, ?, 'pending'
)`,
    job.id,
    studentId,
    job.tutor_id,
    transactionId || null,
    receiptImage,
  );

  return result.insertId;
}

async function listPaymentsForStudent(studentId) {
  return await query(
    `SELECT p.id, p.job_id, p.amount, p.status, p.transaction_id, p.receipt_image, p.created_at
     FROM payments p
     WHERE p.student_id = ?
     ORDER BY p.created_at DESC`,
    [studentId],
  );
}

async function getPaymentById(paymentId, studentId) {
  const rows = await query(`SELECT * FROM payments WHERE id = ?`, [paymentId]);
  if (!rows.length) return null;
  const payment = rows[0];
  if (payment.student_id !== studentId) return null;
  return payment;
}

module.exports = {
  createPayment,
};

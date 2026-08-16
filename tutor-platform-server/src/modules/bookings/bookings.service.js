const { query } = require("../../db/query");
const HttpError = require("../../utils/httpError");
const BookingStatus = require("../../constants/bookingStatus");
const TutorStatus = require("../../constants/tutorStatus");
const env = require("../../config/env");
const { sendEmailSafely } = require("../../services/email.service");

function buildBookingSelectQuery(whereClause = "", params = []) {
  return query(
    `SELECT
        b.id,
        b.family_id,
        b.tutor_id,
        b.job_post_id,
        b.start_time,
        b.end_time,
        b.session_type,
        b.location_note,
        b.status,
        b.student_name,
        b.grade,
        b.curriculum,
        b.days_per_week,
        b.hours_per_day,
        b.created_at,
        bp.amount,
        bp.status AS payment_status,
        bp.receipt_url,
        bp.transaction_ref,
        tad.fayda_id_url AS tutor_fayda_id_url,
        tutor.full_name AS tutor_name,
        family.full_name AS family_name
     FROM bookings b
     LEFT JOIN booking_payments bp ON bp.booking_id = b.id
     LEFT JOIN tutor_application_details tad ON tad.tutor_id = b.tutor_id
     LEFT JOIN users tutor ON tutor.id = b.tutor_id
     LEFT JOIN users family ON family.id = b.family_id
     ${whereClause}
     ORDER BY b.created_at DESC`,
    params,
  );
}

async function createBooking(familyId, data) {
  const tutorRows = await query(
    `SELECT
       u.id,
       tp.status,
       tp.is_available
     FROM users u
     INNER JOIN tutor_profiles tp ON tp.tutor_id = u.id
     WHERE u.id = ?
       AND u.role = 'TUTOR'`,
    [data.tutor_id],
  );

  if (tutorRows.length === 0) {
    throw new HttpError(404, "Tutor not found");
  }

  const tutor = tutorRows[0];

  if (tutor.status !== TutorStatus.APPROVED) {
    throw new HttpError(403, "Only approved tutors can be booked");
  }

  if (!tutor.is_available) {
    throw new HttpError(403, "Tutor profile is inactive");
  }

  const bookingResult = await query(
    `INSERT INTO bookings
      (family_id, tutor_id, start_time, end_time, session_type, location_note, status,
       student_name, grade, curriculum, days_per_week, hours_per_day)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      familyId,
      data.tutor_id,
      data.start_time,
      data.end_time,
      data.session_type,
      data.location_note || null,
      BookingStatus.PENDING_VERIFICATION,
      data.student_name,
      data.grade,
      data.curriculum,
      data.days_per_week,
      data.hours_per_day,
    ],
  );

  const bookingId = bookingResult.insertId;

  await query(
    `INSERT INTO booking_payments
      (booking_id, amount, status)
     VALUES (?, ?, ?)`,
    [bookingId, data.amount, "PENDING"],
  );

  return {
    bookingId,
    status: BookingStatus.PENDING_VERIFICATION,
  };
}

async function attachReceiptToBooking(bookingId, familyId, data, receiptFile) {
  const bookingRows = await query(
    `SELECT
       b.id,
       b.student_name,
       b.grade,
       b.curriculum,
       b.session_type,
       b.location_note,
       b.days_per_week,
       b.hours_per_day,
       f.full_name AS family_name,
       f.email AS family_email,
       t.full_name AS tutor_name,
       t.email AS tutor_email
     FROM bookings b
     JOIN users f ON f.id = b.family_id
     JOIN users t ON t.id = b.tutor_id
     WHERE b.id = ? AND b.family_id = ?`,
    [bookingId, familyId],
  );

  if (bookingRows.length === 0) {
    throw new HttpError(404, "Booking not found");
  }

  const receiptUrl = receiptFile
    ? `/uploads/receipts/${receiptFile.filename}`
    : null;

  if (!receiptUrl && !data.transaction_ref) {
    throw new HttpError(400, "Provide receipt file and/or transaction_ref");
  }

  await query(
    `UPDATE booking_payments
     SET receipt_url = COALESCE(?, receipt_url),
         transaction_ref = COALESCE(?, transaction_ref)
     WHERE booking_id = ?`,
    [receiptUrl, data.transaction_ref || null, bookingId],
  );

  const booking = bookingRows[0];
  const adminEmail = process.env.ADMIN_EMAIL || env.EMAIL_USER;

  if (adminEmail) {
    await sendEmailSafely({
      to: adminEmail,
      subject: "New booking payment awaiting approval",
      html: `
        <h2>New Booking Payment Submitted</h2>
        <p><strong>Family:</strong> ${booking.family_name || "Family"} &lt;${booking.family_email || ""}&gt;</p>
        <p><strong>Tutor:</strong> ${booking.tutor_name || "Tutor"} &lt;${booking.tutor_email || ""}&gt;</p>
        <p><strong>Student:</strong> ${booking.student_name || "-"}</p>
        <p><strong>Grade:</strong> ${booking.grade || "-"}</p>
        <p><strong>Curriculum:</strong> ${booking.curriculum || "-"}</p>
        <p><strong>Session:</strong> ${booking.session_type || "-"}, ${booking.days_per_week || "-"} days/week, ${booking.hours_per_day || "-"} hours/day</p>
        <p><strong>Location / requirement:</strong><br>${String(booking.location_note || "-").replace(/\n/g, "<br>")}</p>
        <p><strong>Transaction reference:</strong> ${data.transaction_ref || "-"}</p>
        <p>Review the receipt and approve or reject the payment in the admin dashboard.</p>
      `,
    });
  }

  return {
    bookingId,
    receipt_url: receiptUrl,
    transaction_ref: data.transaction_ref || null,
  };
}

async function listFamilyBookings(familyId) {
  return buildBookingSelectQuery("WHERE b.family_id = ?", [familyId]);
}

async function listTutorBookings(tutorId) {
  return buildBookingSelectQuery("WHERE b.tutor_id = ?", [tutorId]);
}

async function listAdminBookings() {
  return buildBookingSelectQuery();
}

async function getBookingById(bookingId, userId, role) {
  const bookingRows = await buildBookingSelectQuery("WHERE b.id = ?", [
    bookingId,
  ]);

  if (bookingRows.length === 0) {
    throw new HttpError(404, "Booking not found");
  }

  const booking = bookingRows[0];

  if (role === "ADMIN") {
    return booking;
  }

  if (role === "FAMILY" && booking.family_id === userId) {
    return booking;
  }

  if (role === "TUTOR" && booking.tutor_id === userId) {
    return booking;
  }

  throw new HttpError(403, "You do not have access to this booking");
}

async function updateBookingStatus(bookingId, role, status) {
  if (role !== "ADMIN") {
    throw new HttpError(403, "Only admins can update booking status");
  }

  const validStatuses = Object.values(BookingStatus);

  if (!validStatuses.includes(status)) {
    throw new HttpError(400, "Invalid booking status");
  }

  const bookingRows = await query("SELECT id FROM bookings WHERE id = ?", [
    bookingId,
  ]);

  if (bookingRows.length === 0) {
    throw new HttpError(404, "Booking not found");
  }

  await query("UPDATE bookings SET status = ? WHERE id = ?", [
    status,
    bookingId,
  ]);

  return {
    bookingId,
    status,
  };
}

module.exports = {
  createBooking,
  attachReceiptToBooking,
  listFamilyBookings,
  listTutorBookings,
  listAdminBookings,
  getBookingById,
  updateBookingStatus,
};

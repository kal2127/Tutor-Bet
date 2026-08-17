const { query } = require("../../db/query");
const { sendEmailSafely } = require("../../services/email.service");
const logger = require("../../utils/logger");
const BookingStatus = require("../../constants/bookingStatus");
const TutorStatus = require("../../constants/tutorStatus");
const HttpError = require("../../utils/httpError");
const jobPostService = require("../job-posts/jobPosts.service");

async function getPendingTutors() {
  return await query(
    `
    SELECT
      u.id,
      u.id AS user_id,
      tp.tutor_id,
      u.full_name,
      u.full_name AS name,
      u.email,
      u.phone,
      u.phone AS contact,
      tp.bio,
      tp.location_city,
      tp.location_area,
      CONCAT_WS(', ', tp.location_city, tp.location_area) AS location,
      tp.education,
      tp.education AS EducationLevel,
      tp.experience_years,
      tp.experience_years AS experience,
      tp.hourly_rate,
      tp.status,
      tad.gender,
      tad.employment_status,
      tad.organization,
      tad.grade_levels,
      tad.hourly_rates_by_grade,
      tad.subjects,
      tad.languages,
      tad.curriculum_options,
      tad.has_tempo,
      tad.cgpa,
      tad.profile_photo_url,
      tad.certification_urls,
      tad.fayda_id_url,
      tad.highschool_transcript_url,
      tad.tempo_url,
      CASE
        WHEN tp.status = 'APPROVED' THEN 'yes'
        WHEN tp.status = 'REJECTED' THEN 'rejected'
        ELSE 'pending'
      END AS approved,
      tp.is_available,
      tp.created_at
    FROM users u
    INNER JOIN tutor_profiles tp ON tp.tutor_id = u.id
    LEFT JOIN tutor_application_details tad ON tad.tutor_id = u.id
    WHERE u.role = 'TUTOR'
      AND tp.status = ?
    ORDER BY tp.created_at ASC
    `,
    [TutorStatus.PENDING],
  );
}

async function getTutors() {
  return await query(
    `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.phone,
      u.is_active,
      u.created_at,
      tp.status,
      tp.location_city,
      tp.location_area,
      tp.education,
      tp.experience_years,
      tp.hourly_rate,
      tp.is_available,
      tb.registration_paid,
      tb.billing_status
    FROM users u
    LEFT JOIN tutor_profiles tp ON tp.tutor_id = u.id
    LEFT JOIN tutor_billing tb ON tb.tutor_id = u.id
    WHERE u.role = 'TUTOR'
    ORDER BY u.created_at DESC
    `,
  );
}

async function getFamilies() {
  return await query(
    `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.phone,
      u.is_active,
      u.created_at,
      COUNT(DISTINCT jp.id) AS requests_count,
      COUNT(DISTINCT b.id) AS bookings_count
    FROM users u
    LEFT JOIN tutor_job_posts jp ON jp.family_id = u.id
    LEFT JOIN bookings b ON b.family_id = u.id
    WHERE u.role = 'FAMILY'
    GROUP BY u.id
    ORDER BY u.created_at DESC
    `,
  );
}

async function setUserActive(userId, isActive) {
  const id = Number(userId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "Invalid user id");
  }

  const result = await query(
    "UPDATE users SET is_active = ? WHERE id = ? AND role IN ('FAMILY','TUTOR')",
    [isActive ? 1 : 0, id],
  );

  if (result.affectedRows === 0) {
    throw new HttpError(404, "User not found");
  }

  return { userId: id, is_active: Boolean(isActive) };
}

async function approveTutor(id) {
  const tutorId = Number(id);

  if (!Number.isInteger(tutorId) || tutorId <= 0) {
    throw new HttpError(400, "Invalid tutor id");
  }

  const tutorRows = await query(
    `SELECT u.full_name, u.email
     FROM users u
     INNER JOIN tutor_profiles tp ON tp.tutor_id = u.id
     WHERE u.id = ? AND u.role = 'TUTOR'`,
    [tutorId],
  );

  if (!tutorRows.length) {
    throw new HttpError(404, "Tutor profile not found");
  }

  const result = await query(
    `
    UPDATE tutor_profiles tp
    INNER JOIN users u ON u.id = tp.tutor_id
    SET tp.status = ?,
        tp.is_available = 1,
        u.is_active = 1
    WHERE tp.tutor_id = ?
      AND u.role = 'TUTOR'
    `,
    [TutorStatus.APPROVED, tutorId],
  );

  if (result.affectedRows === 0) {
    throw new HttpError(404, "Tutor profile not found");
  }

  await sendEmailSafely({
    to: tutorRows[0].email,
    subject: "Your Tutor ቤት profile has been approved",
    html: `
      <p>Hello ${tutorRows[0].full_name},</p>
      <p>Your tutor profile has been approved by the admin.</p>
      <p>Your public profile can now appear on Tutor ቤት, and you can apply to open family requests from your tutor dashboard.</p>
      <p>Please log in to your tutor dashboard to review open family requests and update your profile.</p>
    `,
  });

  return { tutorId, status: TutorStatus.APPROVED };
}

async function rejectTutor(id) {
  const tutorId = Number(id);

  if (!Number.isInteger(tutorId) || tutorId <= 0) {
    throw new HttpError(400, "Invalid tutor id");
  }

  const tutorRows = await query(
    `SELECT u.full_name, u.email
     FROM users u
     INNER JOIN tutor_profiles tp ON tp.tutor_id = u.id
     WHERE u.id = ? AND u.role = 'TUTOR'`,
    [tutorId],
  );

  if (!tutorRows.length) {
    throw new HttpError(404, "Tutor profile not found");
  }

  await query(
    `
    UPDATE tutor_profiles tp
    INNER JOIN users u ON u.id = tp.tutor_id
    SET tp.status = ?,
        tp.is_available = 0,
        u.is_active = 0
    WHERE tp.tutor_id = ?
      AND u.role = 'TUTOR'
    `,
    [TutorStatus.REJECTED, tutorId],
  );

  await sendEmailSafely({
    to: tutorRows[0].email,
    subject: "Your Tutor ቤት profile was not approved",
    html: `
      <p>Hello ${tutorRows[0].full_name},</p>
      <p>Your tutor application was reviewed, but it was not approved.</p>
      <p>Please contact support or review your submitted documents if you need more information.</p>
    `,
  });

  try {
    const result = await query(
      "DELETE FROM users WHERE id = ? AND role = 'TUTOR'",
      [tutorId],
    );

    if (result.affectedRows === 0) {
      throw new HttpError(404, "Tutor profile not found");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error?.code !== "ER_ROW_IS_REFERENCED_2") throw error;

    const releasedEmail = `rejected-${tutorId}-${Date.now()}@tutorbet.local`;
    await query(
      `UPDATE users
       SET email = ?,
           google_sub = NULL,
           is_active = 0
       WHERE id = ?
         AND role = 'TUTOR'`,
      [releasedEmail, tutorId],
    );
  }

  return { tutorId, status: TutorStatus.REJECTED, unregistered: true };
}
async function getDashboardStatistics() {
  const totalUsers = await query("SELECT COUNT(*) AS total FROM users");

  const totalTutors = await query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'TUTOR'",
  );

  const pendingTutors = await query(
    "SELECT COUNT(*) AS total FROM tutor_profiles WHERE status = ?",
    [TutorStatus.PENDING],
  );

  const approvedTutors = await query(
    "SELECT COUNT(*) AS total FROM tutor_profiles WHERE status = ?",
    [TutorStatus.APPROVED],
  );

  const availableTutors = await query(
    "SELECT COUNT(*) AS total FROM tutor_profiles WHERE is_available = 1",
  );

  const totalFamilies = await query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'FAMILY'",
  );

  const activeJobs = await query(
    "SELECT COUNT(*) AS total FROM bookings WHERE status IN ('PENDING_VERIFICATION', 'CONFIRMED')",
  );

  const completedJobs = await query(
    "SELECT COUNT(*) AS total FROM bookings WHERE status = 'COMPLETED'",
  );

  const pendingPayments = await query(
    "SELECT COUNT(*) AS total FROM booking_payments WHERE status = 'PENDING'",
  );

  const totalFeedback = await query("SELECT COUNT(*) AS total FROM feedback");

  return {
    totalUsers: totalUsers[0].total,

    totalTutors: totalTutors[0].total,

    pendingTutors: pendingTutors[0].total,

    approvedTutors: approvedTutors[0].total,

    availableTutors: availableTutors[0].total,

    totalStudents: totalFamilies[0].total,

    totalFamilies: totalFamilies[0].total,

    activeJobs: activeJobs[0].total,

    completedJobs: completedJobs[0].total,

    pendingPayments: pendingPayments[0].total,

    totalFeedback: totalFeedback[0].total,
  };
}
async function getPendingPayments() {
  // Return booking_payments awaiting verification first
  const bp = await query(
    `SELECT
      bp.id,
      bp.booking_id,
      bp.amount,
      bp.status,
      bp.receipt_url,
      bp.transaction_ref,
      bp.created_at,

      b.family_id,
      b.tutor_id,

      f.full_name AS family_name,
      t.full_name AS tutor_name

    FROM booking_payments bp
    JOIN bookings b ON bp.booking_id = b.id
    JOIN users f ON b.family_id = f.id
    JOIN users t ON b.tutor_id = t.id
    WHERE bp.status = 'PENDING'
    ORDER BY bp.created_at ASC`,
  );

  return bp;
}

async function getRecentBookings(limit = 10) {
  return await query(
    `SELECT b.id, b.family_id, b.tutor_id, b.status, b.created_at,
            f.full_name AS family_name, t.full_name AS tutor_name
     FROM bookings b
     JOIN users f ON f.id = b.family_id
     JOIN users t ON t.id = b.tutor_id
     ORDER BY b.created_at DESC
     LIMIT ?`,
    [limit],
  );
}

async function getRevenueSummary(days = 30) {
  // total revenue and count in the past `days`
  const rows = await query(
    `SELECT
       COUNT(*) AS payments_count,
       IFNULL(SUM(amount),0) AS total_revenue
     FROM booking_payments bp
     WHERE bp.status = 'PAID' AND bp.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days],
  );

  return {
    payments_count: rows[0].payments_count || 0,
    total_revenue: Number(rows[0].total_revenue || 0),
  };
}
async function approvePayment(paymentId) {
  // First, try booking_payments flow
  const bpRows = await query("SELECT * FROM booking_payments WHERE id = ?", [
    paymentId,
  ]);

  if (bpRows.length) {
    const bp = bpRows[0];

    if (bp.status !== "PENDING") {
      throw new Error("Booking approval is not pending");
    }

    // mark payment as paid
    await query("UPDATE booking_payments SET status = 'PAID' WHERE id = ?", [
      paymentId,
    ]);

    // mark booking as confirmed
    await query("UPDATE bookings SET status = ? WHERE id = ?", [
      BookingStatus.CONFIRMED,
      bp.booking_id,
    ]);

    // Notify tutor and family with contact info (do not fail on email errors)
    try {
      const rows = await query(
        `SELECT
            b.family_id,
            b.tutor_id,
            b.student_name,
            b.grade,
            b.curriculum,
            b.session_type,
            b.location_note,
            b.days_per_week,
            b.hours_per_day,
            f.email AS family_email,
            f.full_name AS family_name,
            f.phone AS family_phone,
            t.email AS tutor_email,
            t.full_name AS tutor_name,
            t.phone AS tutor_phone
         FROM bookings b
         JOIN users f ON b.family_id = f.id
         JOIN users t ON b.tutor_id = t.id
         WHERE b.id = ?`,
        [bp.booking_id],
      );

      if (rows.length) {
        const info = rows[0];

        await sendEmailSafely({
          to: info.tutor_email,
          subject: "You have been chosen for a Tutor ቤት booking",
          html: `
            <p>Hello ${info.tutor_name},</p>
            <p>The family booking has been approved. You have been chosen for this tutoring session.</p>
            <h3>Family Contact</h3>
            <p><strong>Name:</strong> ${info.family_name || "-"}</p>
            <p><strong>Email:</strong> ${info.family_email || "-"}</p>
            <p><strong>Phone:</strong> ${info.family_phone || "-"}</p>
            <h3>Booking Details</h3>
            <p><strong>Student:</strong> ${info.student_name || "-"}</p>
            <p><strong>Grade:</strong> ${info.grade || "-"}</p>
            <p><strong>Curriculum:</strong> ${info.curriculum || "-"}</p>
            <p><strong>Session:</strong> ${info.session_type || "-"}, ${info.days_per_week || "-"} days/week, ${info.hours_per_day || "-"} hours/day</p>
            <p><strong>Location / requirement:</strong><br>${String(info.location_note || "-").replace(/\n/g, "<br>")}</p>
          `,
        });

        await sendEmailSafely({
          to: info.family_email,
          subject: "Your Tutor ቤት booking has been approved",
          html: `
            <p>Hello ${info.family_name},</p>
            <p>Your booking has been approved. You can now contact the tutor directly.</p>
            <h3>Tutor Contact</h3>
            <p><strong>Name:</strong> ${info.tutor_name || "-"}</p>
            <p><strong>Email:</strong> ${info.tutor_email || "-"}</p>
            <p><strong>Phone:</strong> ${info.tutor_phone || "-"}</p>
            <h3>Booking Details</h3>
            <p><strong>Student:</strong> ${info.student_name || "-"}</p>
            <p><strong>Grade:</strong> ${info.grade || "-"}</p>
            <p><strong>Curriculum:</strong> ${info.curriculum || "-"}</p>
            <p><strong>Session:</strong> ${info.session_type || "-"}, ${info.days_per_week || "-"} days/week, ${info.hours_per_day || "-"} hours/day</p>
          `,
        });
      }
    } catch (err) {
      logger.error("Error sending booking confirmation emails:", err.message);
    }

    return;
  }

  // Fallback: legacy payments table
  const payments = await query(
    `SELECT *
         FROM payments
         WHERE id=?`,
    [paymentId],
  );

  if (payments.length === 0) throw new Error("Payment not found");

  const payment = payments[0];

  await query(
    `UPDATE payments
         SET status='completed'
         WHERE id=?`,
    [paymentId],
  );

  await query(
    `UPDATE jobs
         SET status='open'
         WHERE id=?`,
    [payment.job_id],
  );
}
async function rejectPayment(paymentId, remarks) {
  // Try booking_payments first
  const bpRows = await query("SELECT * FROM booking_payments WHERE id = ?", [
    paymentId,
  ]);

  if (bpRows.length) {
    const bp = bpRows[0];

    await query(
      "UPDATE booking_payments SET status = 'FAILED', remarks = ? WHERE id = ?",
      [remarks || null, paymentId],
    );

    // update booking status
    await query("UPDATE bookings SET status = ? WHERE id = ?", [
      BookingStatus.PAYMENT_REJECTED,
      bp.booking_id,
    ]);

    // Notify family about rejection
    try {
      const rows = await query(
        `SELECT b.family_id, b.tutor_id, f.email AS family_email, f.full_name AS family_name
         FROM bookings b
         JOIN users f ON b.family_id = f.id
         WHERE b.id = ?`,
        [bp.booking_id],
      );

      if (rows.length) {
        const info = rows[0];
        await sendEmailSafely({
          to: info.family_email,
          subject: "Booking Rejected",
          html: `<p>Hello ${info.family_name},</p><p>Your booking was rejected. Remarks: ${remarks || ""}</p>`,
        });
      }
    } catch (err) {
      logger.error("Error sending payment rejection email:", err.message);
    }

    return;
  }

  // Fallback to legacy payments
  await query(
    `UPDATE payments
         SET
            status='failed',
            remarks=?
         WHERE id=?`,
    [remarks, paymentId],
  );
}

async function getPendingRequests() {
  return jobPostService.listPendingJobPostsForAdmin();
}

async function approveRequest(adminId, requestId) {
  const id = Number(requestId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "Invalid request id");
  }

  return jobPostService.approveJobPost(adminId, id);
}

async function rejectRequest(adminId, requestId, reason) {
  const id = Number(requestId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "Invalid request id");
  }

  return jobPostService.rejectJobPost(adminId, id, reason);
}

module.exports = {
  getTutors,

  getFamilies,

  setUserActive,

  getPendingTutors,

  approveTutor,

  rejectTutor,

  getDashboardStatistics,

  getPendingPayments,

  approvePayment,

  rejectPayment,

  getPendingRequests,

  approveRequest,

  rejectRequest,
};

const { query } = require("../../db/query");
const HttpError = require("../../utils/httpError");

const JobStatus = require("../../constants/jobStatus");
const TutorStatus = require("../../constants/tutorStatus");
const ApplicationStatus = require("../../constants/applicationStatus");
const { sendEmail } = require("../../services/email.service");
const logger = require("../../utils/logger");
const BookingStatus = require("../../constants/bookingStatus");
const { formatGradePricing } = require("../../utils/gradePricing");
const { adminActionButton } = require("../../utils/adminEmailActions");

async function sendEmailWithFallback(options) {
  try {
    await sendEmail(options);
  } catch (error) {
    logger.error("Failed to send job-post email:", error.message);
  }
}

function requestReceiptUrl(file) {
  return file ? `/uploads/request-receipts/${file.filename}` : null;
}

async function createJobPost(familyId, data, receiptFile) {
  const result = await query(
    `INSERT INTO tutor_job_posts
      (
        family_id,
        title,
        description,
        student_name,
        grade,
        curriculum,
        subject,
        location_note,
        session_type,
        days_per_week,
        hours_per_day,
        budget,
        request_payment_amount,
        request_payment_receipt_url,
        request_payment_transaction_ref,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      familyId,
      data.title,
      data.description || null,
      data.student_name,
      data.grade,
      data.curriculum,
      data.subject || null,
      data.location_note || null,
      data.session_type,
      data.days_per_week,
      data.hours_per_day,
      data.budget ?? null,
      data.request_payment_amount ?? data.budget ?? null,
      requestReceiptUrl(receiptFile),
      data.request_payment_transaction_ref || null,
      JobStatus.PENDING_APPROVAL,
    ],
  );

  const familyRows = await query(
    "SELECT full_name, email FROM users WHERE id = ?",
    [familyId],
  );
  const family = familyRows[0] || {};
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

  if (adminEmail) {
    await sendEmailWithFallback({
      to: adminEmail,
      subject: "New tutor request awaiting approval",
      html: `
        <h2>New Tutor Request Submitted</h2>
        <p><strong>Family:</strong> ${family.full_name || "Family"} &lt;${family.email || ""}&gt;</p>
        <p><strong>Request:</strong> ${data.title}</p>
        <p><strong>Grade:</strong> ${data.grade}</p>
        <p><strong>Curriculum:</strong> ${data.curriculum}</p>
        <p><strong>Budget:</strong> ${data.budget ?? "Not specified"}</p>
        <p>Review and approve the request in the admin dashboard.</p>
        ${adminActionButton("Approve request", "posting-approval", {
          approve: "request",
          id: result.insertId,
        })}
      `,
    });
  }

  return {
    jobPostId: result.insertId,
    status: JobStatus.PENDING_APPROVAL,
  };
}

async function listPendingJobPostsForAdmin() {
  return await query(
    `SELECT
        jp.*,
        u.full_name AS family_name,
        u.email AS family_email,
        u.phone AS family_phone
     FROM tutor_job_posts jp
     INNER JOIN users u ON u.id = jp.family_id
     WHERE jp.status = ?
     ORDER BY jp.created_at ASC`,
    [JobStatus.PENDING_APPROVAL],
  );
}

async function approveJobPost(adminId, jobPostId) {
  const result = await query(
    `UPDATE tutor_job_posts
     SET status = ?, approved_at = CURRENT_TIMESTAMP, approved_by = ?
     WHERE id = ? AND status = ?`,
    [JobStatus.OPEN, adminId, jobPostId, JobStatus.PENDING_APPROVAL],
  );

  if (result.affectedRows === 0) {
    throw new HttpError(404, "Pending request not found.");
  }

  const rows = await query(
    `SELECT jp.title, u.email, u.full_name
     FROM tutor_job_posts jp
     INNER JOIN users u ON u.id = jp.family_id
     WHERE jp.id = ?`,
    [jobPostId],
  );

  if (rows.length) {
    await sendEmailWithFallback({
      to: rows[0].email,
      subject: "Your tutor request is now open",
      html: `<p>Hello ${rows[0].full_name},</p><p>Your request <strong>${rows[0].title}</strong> has been approved and is now visible to tutors.</p>`,
    });
  }

  return { jobPostId, status: JobStatus.OPEN };
}

async function rejectJobPost(adminId, jobPostId, reason) {
  const result = await query(
    `UPDATE tutor_job_posts
     SET status = ?, approved_at = CURRENT_TIMESTAMP, approved_by = ?
     WHERE id = ? AND status = ?`,
    [JobStatus.REJECTED, adminId, jobPostId, JobStatus.PENDING_APPROVAL],
  );

  if (result.affectedRows === 0) {
    throw new HttpError(404, "Pending request not found.");
  }

  const rows = await query(
    `SELECT jp.title, u.email, u.full_name
     FROM tutor_job_posts jp
     INNER JOIN users u ON u.id = jp.family_id
     WHERE jp.id = ?`,
    [jobPostId],
  );

  if (rows.length) {
    await sendEmailWithFallback({
      to: rows[0].email,
      subject: "Your tutor request was not approved",
      html: `
        <p>Hello ${rows[0].full_name},</p>
        <p>Your request <strong>${rows[0].title}</strong> was not approved.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
        <p>Please review your request details and contact support if needed.</p>
      `,
    });
  }

  return { jobPostId, status: JobStatus.REJECTED };
}

async function listOpenJobPostsForTutors(tutorId) {
  return await query(
    `SELECT
        jp.id,
        jp.title,
        jp.description,
        jp.student_name,
        jp.grade,
        jp.curriculum,
        jp.subject,
        jp.location_note,
        jp.session_type,
        jp.days_per_week,
        jp.hours_per_day,
        jp.budget,
        jp.status,
        jp.created_at,
        a.id AS my_application_id,
        a.status AS my_application_status
     FROM tutor_job_posts jp
     LEFT JOIN tutor_job_applications a
       ON a.job_post_id = jp.id
      AND a.tutor_id = ?
     WHERE jp.status = ?
        OR a.id IS NOT NULL
     ORDER BY
       CASE WHEN jp.status = ? AND a.id IS NULL THEN 0 ELSE 1 END,
       jp.created_at DESC,
       jp.id DESC`,
    [tutorId, JobStatus.OPEN, JobStatus.OPEN],
  );
}

async function applyToJobPost(tutorId, jobPostId, data) {
  // Check tutor profile

  const tutorRows = await query(
    `SELECT
            tutor_id,
            status,
            is_available
         FROM tutor_profiles
         WHERE tutor_id=?`,
    [tutorId],
  );

  if (!tutorRows.length) {
    throw new HttpError(404, "Tutor profile not found");
  }

  const tutor = tutorRows[0];

  if (tutor.status !== TutorStatus.APPROVED) {
    throw new HttpError(403, "Only approved tutors can apply.");
  }

  if (!tutor.is_available) {
    throw new HttpError(403, "Your profile is inactive.");
  }

  // Check Job

  const jobRows = await query(
    `SELECT
            id,
            title,
            status,
            family_id
         FROM tutor_job_posts
         WHERE id=?`,
    [jobPostId],
  );

  if (!jobRows.length) {
    throw new HttpError(404, "Job post not found");
  }

  const job = jobRows[0];

  if (job.status !== JobStatus.OPEN) {
    throw new HttpError(400, "This job is no longer accepting applications.");
  }

  // Prevent duplicate application

  const existing = await query(
    `SELECT id
         FROM tutor_job_applications
         WHERE job_post_id=? AND tutor_id=?`,
    [jobPostId, tutorId],
  );

  if (existing.length) {
    throw new HttpError(409, "You already applied to this job.");
  }

  // Create application

  const result = await query(
    `INSERT INTO tutor_job_applications
        (
            job_post_id,
            tutor_id,
            message,
            proposed_rate,
            status
        )
        VALUES (?,?,?,?,?)`,
    [
      jobPostId,
      tutorId,
      data.message || null,
      data.proposed_rate ?? null,
      ApplicationStatus.APPLIED,
    ],
  );

  // Get family information

  const familyRows = await query(
    `SELECT
            email,
            full_name
         FROM users
         WHERE id=?`,
    [job.family_id],
  );

  // Get tutor information

  const tutorInfo = await query(
    `SELECT
        u.full_name,
        u.email,
        u.phone,
        tp.bio,
        tp.location_city,
        tp.location_area,
        tp.education,
        tp.experience_years,
        tp.hourly_rate,
        tad.hourly_rates_by_grade
     FROM users u
     INNER JOIN tutor_profiles tp ON tp.tutor_id = u.id
     LEFT JOIN tutor_application_details tad ON tad.tutor_id = u.id
     WHERE u.id=?`,
    [tutorId],
  );

  const tutorProfile = tutorInfo[0] || {};
  const proposedRate = data.proposed_rate ?? tutorProfile.hourly_rate ?? null;
  const tutorLocation = [tutorProfile.location_city, tutorProfile.location_area]
    .filter(Boolean)
    .join(", ");

  // Send notification

  // Send notification (don't fail the whole request if email fails)
  await sendEmailWithFallback({
    to: familyRows[0].email,
    subject: "New Tutor Application - Tutor ቤት",
    html: `
      <h2>New Tutor Application</h2>

      <p>Hello ${familyRows[0].full_name},</p>

      <p>
        <strong>${tutorProfile.full_name}</strong>
        has applied to your tutor request.
      </p>

      <p>
        <strong>Request:</strong> ${job.title}
      </p>

      <h3>Tutor Profile</h3>

      <ul>
        <li><strong>Name:</strong> ${tutorProfile.full_name || "-"}</li>
        <li><strong>Email:</strong> ${tutorProfile.email || "-"}</li>
        <li><strong>Phone:</strong> ${tutorProfile.phone || "-"}</li>
        <li><strong>Location:</strong> ${tutorLocation || "-"}</li>
        <li><strong>Education:</strong> ${tutorProfile.education || "-"}</li>
        <li><strong>Experience:</strong> ${tutorProfile.experience_years ?? 0} years</li>
        <li><strong>Hourly rate:</strong> ${tutorProfile.hourly_rate ?? "-"} ETB</li>
        <li><strong>Grade pricing:</strong> ${formatGradePricing(tutorProfile.hourly_rates_by_grade)}</li>
        <li><strong>Proposed rate:</strong> ${proposedRate ?? "-"} ETB</li>
      </ul>

      ${tutorProfile.bio ? `<p><strong>Bio:</strong> ${tutorProfile.bio}</p>` : ""}
      ${data.message ? `<p><strong>Application message:</strong> ${data.message}</p>` : ""}

      <p>
        To see more of this tutor's profile, open your family dashboard and choose this request.
      </p>

      <p>
        You can compare applications, certifications, and documents from your family dashboard.
      </p>
    `,
  });

  return {
    applicationId: result.insertId,
    status: ApplicationStatus.APPLIED,
  };
}
async function listApplicationsForMyJob(familyId, jobPostId) {
  // Verify ownership

  const jobRows = await query(
    `
        SELECT id
        FROM tutor_job_posts
        WHERE id=? AND family_id=?
        `,
    [jobPostId, familyId],
  );

  if (!jobRows.length) {
    throw new HttpError(404, "Job post not found.");
  }

  // Retrieve applications

  return await query(
    `
        SELECT

            a.id,
            a.job_post_id,
            a.tutor_id,
            a.message,
            a.proposed_rate,
            a.status,
            a.created_at,

            u.full_name,
            u.email,
            u.phone,

            tp.bio,
            tp.location_city,
            tp.location_area,
            tp.education,
            tp.experience_years,
            tp.hourly_rate,
            tp.is_available,

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
            tad.highschool_transcript_url,
            tad.tempo_url

        FROM tutor_job_applications a

        INNER JOIN users u
            ON u.id=a.tutor_id

        INNER JOIN tutor_profiles tp
            ON tp.tutor_id=a.tutor_id

        LEFT JOIN tutor_application_details tad
            ON tad.tutor_id=a.tutor_id

        WHERE a.job_post_id=?

        ORDER BY a.created_at DESC
        `,
    [jobPostId],
  );
}
async function listMyJobPosts(familyId) {
  return await query(
    `
    SELECT *
    FROM tutor_job_posts
    WHERE family_id = ?
    ORDER BY created_at DESC
    `,
    [familyId],
  );
}

async function closeJobPost(familyId, jobId) {
  const jobRows = await query(
    `
    SELECT id, status
    FROM tutor_job_posts
    WHERE id = ? AND family_id = ?
    `,
    [jobId, familyId],
  );

  if (!jobRows.length) {
    throw new HttpError(404, "Job post not found.");
  }

  const job = jobRows[0];
  if ([JobStatus.CLOSED, JobStatus.FULFILLED].includes(job.status)) {
    return { jobPostId: jobId, status: job.status };
  }

  if (![JobStatus.OPEN, JobStatus.PENDING_APPROVAL].includes(job.status)) {
    throw new HttpError(400, "This request cannot be closed.");
  }

  await query(
    `
    UPDATE tutor_job_posts
    SET status = ?
    WHERE id = ? AND family_id = ?
    `,
    [JobStatus.CLOSED, jobId, familyId],
  );

  await query(
    `
    UPDATE tutor_job_applications
    SET status = ?
    WHERE job_post_id = ?
      AND status = ?
    `,
    [ApplicationStatus.REJECTED, jobId, ApplicationStatus.APPLIED],
  );

  return { jobPostId: jobId, status: JobStatus.CLOSED };
}

async function selectTutorApplication(familyId, jobId, applicationId) {
  const jobRows = await query(
    `
SELECT *
FROM tutor_job_posts
WHERE id=? AND family_id=?
`,
    [jobId, familyId],
  );

  if (!jobRows.length) {
    throw new HttpError(404, "Job post not found.");
  }

  const job = jobRows[0];
  if (job.status !== JobStatus.OPEN) {
    throw new HttpError(
      400,

      "This job is already closed.",
    );
  }
  const applicationRows = await query(
    `
SELECT

a.*,

tp.status AS tutor_status,

tp.is_available AS tutor_is_available

FROM tutor_job_applications a

INNER JOIN tutor_profiles tp

ON tp.tutor_id=a.tutor_id

WHERE a.id=?

AND a.job_post_id=?
`,
    [applicationId, jobId],
  );

  if (!applicationRows.length) {
    throw new HttpError(
      404,

      "Application not found.",
    );
  }

  const application = applicationRows[0];

  if (application.status !== ApplicationStatus.APPLIED) {
    throw new HttpError(400, "Application is not selectable.");
  }

  if (application.tutor_status !== TutorStatus.APPROVED) {
    throw new HttpError(403, "Selected tutor is not approved.");
  }

  if (!application.tutor_is_available) {
    throw new HttpError(403, "Selected tutor profile is inactive.");
  }

  await query(
    `
UPDATE tutor_job_applications

SET status=?

WHERE id=?
`,
    [ApplicationStatus.ACCEPTED, applicationId],
  );
  await query(
    `
UPDATE tutor_job_applications

SET status=?

WHERE job_post_id=?

AND id<>?
`,
    [ApplicationStatus.REJECTED, jobId, applicationId],
  );
  await query(
    `
UPDATE tutor_job_posts

SET

status=?,

selected_tutor_id=?

WHERE id=?
`,
    [JobStatus.FULFILLED, application.tutor_id, jobId],
  );
  const booking = await query(
    `
INSERT INTO bookings(

family_id,

tutor_id,

student_name,

grade,

curriculum,

days_per_week,

hours_per_day,

session_type,

location_note,

status,

job_post_id

)

VALUES(

?,?,?,?,?,?,?,?,?,?,?

)
`,
    [
      familyId,

      application.tutor_id,

      job.student_name,

      job.grade,

      job.curriculum,

      job.days_per_week,

      job.hours_per_day,

      job.session_type,

      job.location_note,

      BookingStatus.PENDING_VERIFICATION,

      jobId,
    ],
  );
  await query(
    `
INSERT INTO booking_payments (

booking_id,

amount,

status

)

VALUES (?, ?, ?)
`,
    [booking.insertId, job.budget ?? application.proposed_rate ?? 0, "PENDING"],
  );
  const familyRows = await query(
    `
SELECT

email,

full_name

FROM users

WHERE id=?
`,
    [familyId],
  );
  const tutorRows = await query(
    `
SELECT

email,

full_name

FROM users

WHERE id=?
`,
    [application.tutor_id],
  );
  await sendEmailWithFallback({
    to: tutorRows[0].email,

    subject: "Tutor ቤት booking confirmation",

    html: `

<h2>Congratulations! You were selected</h2>

<p>Hello ${tutorRows[0].full_name},</p>

<p>

The family selected you for <strong>${job.title}</strong>.

</p>

<p>

Please wait for admin approval. We will send another email with family contact details after the booking is approved.

</p>

`,
  });
  await sendEmailWithFallback({
    to: familyRows[0].email,

    subject: "Tutor Selected",

    html: `

<h2>Tutor Selected</h2>

<p>

Hello ${familyRows[0].full_name},

</p>

<p>

You successfully selected a tutor.

</p>

<p>

Your selected tutor booking is waiting for admin approval.

</p>

`,
  });
  return {
    bookingId: booking.insertId,

    selectedTutorId: application.tutor_id,

    jobStatus: JobStatus.FULFILLED,

    bookingStatus: BookingStatus.PENDING_VERIFICATION,
  };
}

module.exports = {
  createJobPost,
  applyToJobPost,
  listApplicationsForMyJob,
  selectTutorApplication,
  closeJobPost,
  listMyJobPosts,
  listOpenJobPostsForTutors,
  listPendingJobPostsForAdmin,
  approveJobPost,
  rejectJobPost,
};

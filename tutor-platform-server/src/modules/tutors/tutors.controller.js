const { query } = require("../../db/query");
const HttpError = require("../../utils/httpError");
const { summarizeHourlyRate } = require("../../utils/gradePricing");
const {
  updateTutorProfileSchema,
  updateAvailabilitySchema,
  listTutorsQuerySchema,
} = require("./tutors.validators");

function parseMaybeJson(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizeTutorProfileBody(body = {}) {
  const normalized = { ...body };

  [
    "grade_levels",
    "hourly_rates_by_grade",
    "subjects",
    "languages",
    "curriculum_options",
  ].forEach((key) => {
    if (normalized[key] !== undefined) {
      normalized[key] = parseMaybeJson(normalized[key]);
    }
  });

  ["experience_years", "hourly_rate", "cgpa"].forEach((key) => {
    if (normalized[key] === "") delete normalized[key];
  });

  return normalized;
}

function fileUrl(file) {
  return file ? `/uploads/tutor-applications/${file.filename}` : null;
}

async function getMyTutorProfile(req, res, next) {
  try {
    const tutorId = req.user.id;

    const rows = await query(
      `SELECT 
         u.id,
         u.full_name,
         u.email,
         u.phone,
         u.role,
         u.is_active,
         tp.bio,
         tp.location_city,
         tp.location_area,
         tp.education,
         tp.experience_years,
         tp.hourly_rate,
         tp.status,
         tp.is_available,
         tb.registration_paid,
         tb.next_renewal_date,
         tb.billing_status,
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
         tad.certification_urls
       FROM users u
       INNER JOIN tutor_profiles tp ON tp.tutor_id = u.id
       INNER JOIN tutor_billing tb ON tb.tutor_id = u.id
       LEFT JOIN tutor_application_details tad ON tad.tutor_id = u.id
       WHERE u.id = ? AND u.role = 'TUTOR'`,
      [tutorId],
    );

    if (rows.length === 0) {
      throw new HttpError(404, "Tutor profile not found");
    }

    return res.ok(rows[0], "Tutor profile fetched successfully");
  } catch (e) {
    next(e);
  }
}

async function updateMyTutorProfile(req, res, next) {
  try {
    const tutorId = req.user.id;
    const data = updateTutorProfileSchema.parse(
      normalizeTutorProfileBody(req.body || {}),
    );

    const existing = await query(
      "SELECT tutor_id FROM tutor_profiles WHERE tutor_id = ?",
      [tutorId],
    );

    if (existing.length === 0) {
      throw new HttpError(404, "Tutor profile not found");
    }

    const nextHourlyRate = data.hourly_rates_by_grade
      ? summarizeHourlyRate(data.hourly_rates_by_grade, data.hourly_rate)
      : data.hourly_rate;

    await query(
      `UPDATE tutor_profiles
       SET bio = COALESCE(?, bio),
           location_city = COALESCE(?, location_city),
           location_area = COALESCE(?, location_area),
           education = COALESCE(?, education),
           experience_years = COALESCE(?, experience_years),
           hourly_rate = COALESCE(?, hourly_rate)
       WHERE tutor_id = ?`,
      [
        data.bio ?? null,
        data.location_city ?? null,
        data.location_area ?? null,
        data.education ?? null,
        data.experience_years ?? null,
        nextHourlyRate ?? null,
        tutorId,
      ],
    );

    const detailRows = await query(
      "SELECT certification_urls FROM tutor_application_details WHERE tutor_id = ?",
      [tutorId],
    );
    const files = req.files || {};
    const profilePhotoUrl = fileUrl(files.profile_photo?.[0]);
    const newCertificationUrls = (files.certifications || [])
      .map((file) => fileUrl(file))
      .filter(Boolean);

    const detailUpdates = [];
    const detailParams = [];

    const setDetail = (column, value) => {
      if (value !== undefined) {
        detailUpdates.push(`${column} = ?`);
        detailParams.push(value);
      }
    };

    setDetail(
      "grade_levels",
      data.grade_levels !== undefined ? JSON.stringify(data.grade_levels || []) : undefined,
    );
    setDetail(
      "hourly_rates_by_grade",
      data.hourly_rates_by_grade !== undefined ? JSON.stringify(data.hourly_rates_by_grade || {}) : undefined,
    );
    setDetail(
      "subjects",
      data.subjects !== undefined ? JSON.stringify(data.subjects || []) : undefined,
    );
    setDetail(
      "languages",
      data.languages !== undefined ? JSON.stringify(data.languages || []) : undefined,
    );
    setDetail(
      "curriculum_options",
      data.curriculum_options !== undefined ? JSON.stringify(data.curriculum_options || []) : undefined,
    );
    setDetail("gender", data.gender);
    setDetail("employment_status", data.employment_status);
    setDetail("organization", data.organization);
    setDetail("cgpa", data.cgpa);
    setDetail("profile_photo_url", profilePhotoUrl || undefined);

    if (newCertificationUrls.length) {
      const existingCertificationUrls = parseJsonArray(
        detailRows[0]?.certification_urls,
      );
      setDetail(
        "certification_urls",
        JSON.stringify([...existingCertificationUrls, ...newCertificationUrls]),
      );
    }

    if (detailUpdates.length) {
      await query(
        `UPDATE tutor_application_details
         SET ${detailUpdates.join(", ")}
         WHERE tutor_id = ?`,
        [...detailParams, tutorId],
      );
    }

    return res.ok(null, "Tutor profile updated successfully");
  } catch (e) {
    next(e);
  }
}

async function updateTutorAvailability(req, res, next) {
  try {
    const tutorId = req.user.id;
    const data = updateAvailabilitySchema.parse(req.body);

    const existing = await query(
      "SELECT tutor_id FROM tutor_profiles WHERE tutor_id = ?",
      [tutorId],
    );

    if (existing.length === 0) {
      throw new HttpError(404, "Tutor profile not found");
    }

    await query(
      `UPDATE tutor_profiles
       SET is_available = ?
       WHERE tutor_id = ?`,
      [data.is_available ? 1 : 0, tutorId],
    );

    return res.ok(
      { is_available: data.is_available },
      `Tutor availability updated to ${data.is_available ? "ACTIVE" : "INACTIVE"}`,
    );
  } catch (e) {
    next(e);
  }
}

async function listPublicTutors(req, res, next) {
  try {
    const filters = listTutorsQuerySchema.parse(req.query);

    let sql = `
      SELECT
        u.id,
        u.full_name,
        tp.bio,
        tp.location_city,
        tp.location_area,
        tp.education,
        tp.experience_years,
        tp.hourly_rate,
        tp.is_available,
        tp.status,
        tad.gender,
        tad.employment_status,
        tad.organization,
        tad.grade_levels,
        tad.hourly_rates_by_grade,
        tad.subjects,
        tad.languages,
        tad.curriculum_options,
        tad.profile_photo_url,
        tad.certification_urls
      FROM users u
      INNER JOIN tutor_profiles tp ON tp.tutor_id = u.id
      LEFT JOIN tutor_application_details tad ON tad.tutor_id = u.id
      WHERE u.role = 'TUTOR'
        AND tp.status = 'APPROVED'
        AND tp.is_available = 1
    `;

    const params = [];

    if (filters.location_city) {
      sql += ` AND tp.location_city = ?`;
      params.push(filters.location_city);
    }

    if (filters.location_area) {
      sql += ` AND tp.location_area = ?`;
      params.push(filters.location_area);
    }

    if (filters.min_rate !== undefined) {
      sql += ` AND tp.hourly_rate >= ?`;
      params.push(filters.min_rate);
    }

    if (filters.max_rate !== undefined) {
      sql += ` AND tp.hourly_rate <= ?`;
      params.push(filters.max_rate);
    }

    sql += ` ORDER BY u.id DESC`;

    const rows = await query(sql, params);

    return res.ok(
      { tutors: rows, count: rows.length },
      "Tutors fetched successfully",
    );
  } catch (e) {
    next(e);
  }
}

async function getPublicTutorById(req, res, next) {
  try {
    const tutorId = Number(req.params.id);

    if (!Number.isInteger(tutorId) || tutorId <= 0) {
      throw new HttpError(400, "Invalid tutor id");
    }

    const rows = await query(
      `SELECT
         u.id,
         u.full_name,
         tp.bio,
         tp.location_city,
         tp.location_area,
         tp.education,
         tp.experience_years,
         tp.hourly_rate,
         tp.is_available,
         tp.status,
         tad.gender,
         tad.employment_status,
         tad.organization,
         tad.grade_levels,
         tad.hourly_rates_by_grade,
         tad.subjects,
         tad.languages,
         tad.curriculum_options,
         tad.profile_photo_url,
         tad.certification_urls
       FROM users u
       INNER JOIN tutor_profiles tp ON tp.tutor_id = u.id
       LEFT JOIN tutor_application_details tad ON tad.tutor_id = u.id
       WHERE u.id = ?
         AND u.role = 'TUTOR'
         AND tp.status = 'APPROVED'
         AND tp.is_available = 1`,
      [tutorId],
    );

    if (rows.length === 0) {
      throw new HttpError(404, "Tutor not found");
    }

    return res.ok({ tutor: rows[0] }, "Tutor fetched successfully");
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getMyTutorProfile,
  updateMyTutorProfile,
  updateTutorAvailability,
  listPublicTutors,
  getPublicTutorById,
};

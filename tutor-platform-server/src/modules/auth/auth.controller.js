const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { query } = require("../../db/query");
const env = require("../../config/env");
const HttpError = require("../../utils/httpError");
const {
  normalizeGradePricingInput,
  summarizeHourlyRate,
} = require("../../utils/gradePricing");
const {
  registerFamilySchema,
  registerTutorSchema,
  loginSchema,
  googleAuthSchema,
} = require("./auth.validators");

const googleClient = new OAuth2Client();

function parseMaybeJson(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeTutorBody(body) {
  const gradeLevels = parseMaybeJson(body.grade_levels);
  const hourlyRatesByGrade = normalizeGradePricingInput(
    gradeLevels,
    body.hourly_rates_by_grade,
  );

  return {
    ...body,
    experience_years: Number(body.experience_years),
    hourly_rate: summarizeHourlyRate(hourlyRatesByGrade, body.hourly_rate),
    cgpa: body.cgpa === undefined || body.cgpa === "" ? undefined : Number(body.cgpa),
    has_tempo: body.has_tempo === true || body.has_tempo === "true",
    grade_levels: gradeLevels,
    hourly_rates_by_grade: hourlyRatesByGrade,
    subjects: parseMaybeJson(body.subjects),
    languages: parseMaybeJson(body.languages),
    curriculum_options: parseMaybeJson(body.curriculum_options),
  };
}

function fileUrl(req, file) {
  if (!file) return null;
  return `/uploads/tutor-applications/${file.filename}`;
}

function signUser(user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, env.jwt.secret, {
    expiresIn: "7d",
  });

  return {
    token,
    user: {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      email: user.email,
    },
  };
}

async function verifyGoogleIdToken(idToken) {
  if (!env.google.clientId) {
    throw new HttpError(500, "GOOGLE_CLIENT_ID is not configured");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.google.clientId,
  });
  const payload = ticket.getPayload();

  if (!payload?.email || !payload?.sub) {
    throw new HttpError(401, "Invalid Google account");
  }

  if (payload.email_verified === false) {
    throw new HttpError(401, "Google email is not verified");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    fullName: payload.name || payload.email.split("@")[0],
  };
}

async function createGooglePasswordHash() {
  return bcrypt.hash(`google:${crypto.randomBytes(32).toString("hex")}`, 10);
}

async function releaseRejectedTutorAccount(user) {
  const tutorStatus = String(user?.tutor_status || "").toUpperCase();
  const inactive = user?.is_active === 0 || user?.is_active === false;

  if (user?.role !== "TUTOR" || (tutorStatus !== "REJECTED" && !(inactive && !tutorStatus))) {
    return false;
  }

  const releasedEmail = `rejected-${user.id}-${Date.now()}@tutorbet.local`;
  await query(
    `UPDATE users
     SET email = ?,
         google_sub = NULL,
         is_active = 0
     WHERE id = ?
       AND role = 'TUTOR'`,
    [releasedEmail, user.id],
  );

  return true;
}

async function findAccountByEmail(email) {
  const rows = await query(
    `SELECT u.id, u.role, u.is_active, tp.status AS tutor_status
     FROM users u
     LEFT JOIN tutor_profiles tp ON tp.tutor_id = u.id
     WHERE u.email = ?
     LIMIT 1`,
    [email],
  );

  return rows[0] || null;
}

async function ensureTutorEmailCanApply(email) {
  const existing = await findAccountByEmail(email);
  if (!existing) return;

  const released = await releaseRejectedTutorAccount(existing);
  if (!released) throw new HttpError(409, "Email already registered");
}

async function registerFamily(req, res, next) {
  try {
    const data = registerFamilySchema.parse(req.body);

    await ensureTutorEmailCanApply(data.email);

    const password_hash = await bcrypt.hash(data.password, 10);

    const result = await query(
      `INSERT INTO users (role, full_name, email, phone, password_hash)
       VALUES ('FAMILY', ?, ?, ?, ?)`,
      [data.full_name, data.email, data.phone, password_hash],
    );

    return res.created(
      { userId: result.insertId },
      "Family registered successfully",
    );
  } catch (e) {
    next(e);
  }
}

/**
 * Tutor registration creates:
 * - users row (role=TUTOR)
 * - tutor_profiles row (status=PENDING)
 * - tutor_billing row (SUSPENDED until payment + approval)
 */
async function registerTutor(req, res, next) {
  try {
    const data = registerTutorSchema.parse(normalizeTutorBody(req.body));

    const existing = await query("SELECT id FROM users WHERE email = ?", [
      data.email,
    ]);
    if (existing.length > 0)
      throw new HttpError(409, "Email already registered");

    let googleProfile = null;
    if (data.google_id_token) {
      googleProfile = await verifyGoogleIdToken(data.google_id_token);
      if (googleProfile.email.toLowerCase() !== data.email.toLowerCase()) {
        throw new HttpError(400, "Google account email does not match application email");
      }
    }

    const password_hash = data.password
      ? await bcrypt.hash(data.password, 10)
      : await createGooglePasswordHash();

    let userResult;
    try {
      userResult = await query(
        `INSERT INTO users (role, full_name, email, phone, password_hash, google_sub, auth_provider)
         VALUES ('TUTOR', ?, ?, ?, ?, ?, ?)`,
        [
          data.full_name,
          data.email,
          data.phone || null,
          password_hash,
          googleProfile?.sub || null,
          googleProfile ? "GOOGLE" : "PASSWORD",
        ],
      );
    } catch (error) {
      if (error?.code !== "ER_DUP_ENTRY") throw error;
      await ensureTutorEmailCanApply(data.email);
      userResult = await query(
        `INSERT INTO users (role, full_name, email, phone, password_hash, google_sub, auth_provider)
         VALUES ('TUTOR', ?, ?, ?, ?, ?, ?)`,
        [
          data.full_name,
          data.email,
          data.phone || null,
          password_hash,
          googleProfile?.sub || null,
          googleProfile ? "GOOGLE" : "PASSWORD",
        ],
      );
    }
    const tutorId = userResult.insertId;

    await query(
      `INSERT INTO tutor_profiles
        (tutor_id, bio, location_city, location_area, education, experience_years, hourly_rate, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        tutorId,
        data.bio || null,
        data.location_city,
        data.capable_location_area,
        data.education,
        data.experience_years,
        data.hourly_rate,
      ],
    );

    await query(
      `INSERT INTO tutor_billing (tutor_id, registration_paid, next_renewal_date, billing_status)
       VALUES (?, 0, NULL, 'SUSPENDED')`,
      [tutorId],
    );

    const files = req.files || {};
    const certificationUrls = (files.certifications || []).map((file) =>
      fileUrl(req, file),
    );

    await query(
      `INSERT INTO tutor_application_details
        (
          tutor_id,
          gender,
          employment_status,
          organization,
          grade_levels,
          hourly_rates_by_grade,
          subjects,
          languages,
          curriculum_options,
          has_tempo,
          cgpa,
          profile_photo_url,
          certification_urls,
          fayda_id_url,
          highschool_transcript_url,
          tempo_url
        )
       VALUES (?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON), ?, ?, ?, CAST(? AS JSON), ?, ?, ?)`,
      [
        tutorId,
        data.gender || null,
        data.employment_status || null,
        data.organization || null,
        JSON.stringify(data.grade_levels || []),
        JSON.stringify(data.hourly_rates_by_grade || {}),
        JSON.stringify(data.subjects || []),
        JSON.stringify(data.languages || []),
        JSON.stringify(data.curriculum_options || []),
        data.has_tempo ? 1 : 0,
        data.cgpa ?? null,
        fileUrl(req, files.profile_photo?.[0]),
        JSON.stringify(certificationUrls),
        fileUrl(req, files.fayda_id?.[0]),
        fileUrl(req, files.highschool_transcript?.[0]),
        fileUrl(req, files.tempo?.[0]),
      ],
    );

    return res.created(
      {
        tutorId,
        status: "PENDING",
        ...signUser({
          id: tutorId,
          role: "TUTOR",
          full_name: data.full_name,
          email: data.email,
        }),
      },
      "Tutor registered successfully",
    );
  } catch (e) {
    next(e);
  }
}

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);

    const rows = await query(
      "SELECT id, role, full_name, email, password_hash, is_active FROM users WHERE email = ?",
      [data.email],
    );
    if (rows.length === 0)
      throw new HttpError(401, "Invalid email or password");

    const user = rows[0];
    if (!user.is_active) throw new HttpError(403, "Account is disabled");

    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) throw new HttpError(401, "Invalid email or password");

    return res.ok(signUser(user), "Login successful");
  } catch (e) {
    next(e);
  }
}

async function googleAuth(req, res, next) {
  try {
    const data = googleAuthSchema.parse(req.body);
    const profile = await verifyGoogleIdToken(data.credential);

    const existing = await query(
      `SELECT
         u.id,
         u.role,
         u.full_name,
         u.email,
         u.is_active,
         u.google_sub,
         tp.status AS tutor_status
       FROM users u
       LEFT JOIN tutor_profiles tp ON tp.tutor_id = u.id
       WHERE u.email = ? OR u.google_sub = ?
       LIMIT 1`,
      [profile.email, profile.sub],
    );

    if (existing.length) {
      const user = existing[0];

      if (data.role === "TUTOR" && await releaseRejectedTutorAccount(user)) {
        return res.ok(
          {
            profile: {
              full_name: profile.fullName,
              email: profile.email,
              google_id_token: data.credential,
            },
          },
          "Complete tutor application",
        );
      }

      if (!user.is_active) throw new HttpError(403, "Account is disabled");

      if (!user.google_sub) {
        await query(
          "UPDATE users SET google_sub = ?, auth_provider = 'GOOGLE' WHERE id = ?",
          [profile.sub, user.id],
        );
      }

      return res.ok(signUser(user), "Google login successful");
    }

    if (data.role === "TUTOR") {
      return res.ok(
        {
          profile: {
            full_name: profile.fullName,
            email: profile.email,
            google_id_token: data.credential,
          },
        },
        "Complete tutor application",
      );
    }

    const passwordHash = await createGooglePasswordHash();
    const result = await query(
      `INSERT INTO users (role, full_name, email, phone, password_hash, google_sub, auth_provider)
       VALUES ('FAMILY', ?, ?, NULL, ?, ?, 'GOOGLE')`,
      [profile.fullName, profile.email, passwordHash, profile.sub],
    );

    return res.created(
      signUser({
        id: result.insertId,
        role: "FAMILY",
        full_name: profile.fullName,
        email: profile.email,
      }),
      "Google signup successful",
    );
  } catch (e) {
    next(e);
  }
}

module.exports = { registerFamily, registerTutor, login, googleAuth };

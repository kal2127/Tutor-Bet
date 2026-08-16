const { z } = require("zod");
const { GRADE_BANDS } = require("../../utils/gradePricing");

const email = z.string().email();
const password = z.string().min(6, "Password must be at least 6 characters");
const fullName = z.string().min(2, "Full name is required");

const registerFamilySchema = z.object({
  full_name: fullName,
  email,
  phone: z.string().min(7).max(30).optional(),
  password,
});

const registerTutorSchema = z.object({
  full_name: fullName,
  email,
  phone: z.string().min(7).max(30),
  password: password.optional(),
  google_id_token: z.string().min(10).optional(),

  // tutor profile basics (you can expand later)
  bio: z.string().max(2000).optional(),
  location_city: z.string().max(80),
  capable_location_area: z.string().max(80),
  education: z.string().max(150),
  experience_years: z.number().int().min(0).max(60),
  hourly_rate: z.number().min(0),
  gender: z.string().max(30).optional(),
  employment_status: z.string().max(40).optional(),
  organization: z.string().max(150).optional(),
  grade_levels: z.array(z.enum(GRADE_BANDS)).min(1, "Choose at least one grade level"),
  hourly_rates_by_grade: z.record(
    z.string(),
    z.object({
      mode: z.enum(["FIXED", "NEGOTIATION"]),
      amount: z.number().min(0).optional(),
    }),
  ).optional(),
  subjects: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  curriculum_options: z.array(z.string()).optional(),
  has_tempo: z.boolean().optional(),
  cgpa: z.number().min(0).max(4).optional(),
}).refine((data) => data.password || data.google_id_token, {
  message: "Password or Google sign-in is required",
  path: ["password"],
}).superRefine((data, ctx) => {
  for (const grade of data.grade_levels || []) {
    const pricing = data.hourly_rates_by_grade?.[grade];
    if (!pricing) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Add pricing for ${grade}`,
        path: ["hourly_rates_by_grade", grade],
      });
      continue;
    }

    if (pricing.mode === "FIXED" && (!pricing.amount || pricing.amount <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Enter a valid hourly rate for ${grade} or choose negotiation`,
        path: ["hourly_rates_by_grade", grade, "amount"],
      });
    }
  }
});

const loginSchema = z.object({
  email,
  password,
});

const googleAuthSchema = z.object({
  credential: z.string().min(10),
  role: z.enum(["FAMILY", "TUTOR"]).default("FAMILY"),
});

module.exports = {
  registerFamilySchema,
  registerTutorSchema,
  loginSchema,
  googleAuthSchema,
};

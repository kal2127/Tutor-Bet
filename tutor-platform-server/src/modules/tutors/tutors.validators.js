const { z } = require("zod");

const gradePricingSchema = z.record(
  z.string(),
  z.object({
    mode: z.enum(["FIXED", "NEGOTIATION"]),
    amount: z.coerce.number().min(0).optional(),
  }),
);

const stringListSchema = z.array(z.string().trim().min(1).max(120)).optional();

const updateTutorProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  location_city: z.string().max(80).optional(),
  location_area: z.string().max(80).optional(),
  education: z.string().max(150).optional(),
  experience_years: z.coerce.number().int().min(0).max(60).optional(),
  hourly_rate: z.coerce.number().min(0).optional(),
  gender: z.string().max(30).optional(),
  employment_status: z.string().max(40).optional(),
  organization: z.string().max(150).optional(),
  grade_levels: stringListSchema,
  hourly_rates_by_grade: gradePricingSchema.optional(),
  subjects: stringListSchema,
  languages: stringListSchema,
  curriculum_options: stringListSchema,
  cgpa: z.coerce.number().min(0).max(100).optional(),
});

const updateAvailabilitySchema = z.object({
  is_available: z.boolean(),
});

const listTutorsQuerySchema = z.object({
  location_city: z.string().max(80).optional(),
  location_area: z.string().max(80).optional(),
  min_rate: z.coerce.number().min(0).optional(),
  max_rate: z.coerce.number().min(0).optional(),
});

module.exports = {
  updateTutorProfileSchema,
  updateAvailabilitySchema,
  listTutorsQuerySchema,
};

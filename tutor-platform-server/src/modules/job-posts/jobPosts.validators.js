const { z } = require("zod");

const createJobPostSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().max(5000).optional(),
  student_name: z.string().min(2).max(120),
  grade: z.string().min(1).max(50),
  curriculum: z.string().min(1).max(100),
  subject: z.string().max(100).optional(),
  location_note: z.string().max(200).optional(),
  session_type: z.enum(["ONLINE", "IN_PERSON"]).default("ONLINE"),
  days_per_week: z.coerce.number().int().min(1).max(7),
  hours_per_day: z.coerce.number().int().min(1).max(12),
  budget: z.coerce.number().min(0).optional(),
  request_payment_amount: z.coerce.number().min(0).optional(),
  request_payment_transaction_ref: z.string().max(120).optional(),
});

const applyToJobSchema = z.object({
  message: z.string().max(3000).optional(),
  proposed_rate: z.number().min(0).optional(),
});

module.exports = {
  createJobPostSchema,
  applyToJobSchema,
};

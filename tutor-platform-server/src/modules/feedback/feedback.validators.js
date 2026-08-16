const { z } = require("zod");

const createFeedbackSchema = z.object({
  booking_id: z.coerce.number().int().positive().optional(),
  rating: z.number().int().min(1).max(5),
  comments: z.string().max(2000).optional(),
});

module.exports = { createFeedbackSchema };

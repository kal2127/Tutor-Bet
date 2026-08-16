const { z } = require("zod");
const BookingStatus = require("../../constants/bookingStatus");

const createBookingSchema = z.object({
  tutor_id: z.number().int().positive(),
  student_name: z.string().min(2),
  grade: z.string().min(1).max(50),
  curriculum: z.string().min(1).max(100),
  days_per_week: z.number().int().min(1).max(7),
  hours_per_day: z.number().int().min(1).max(12),
  start_time: z.string().min(5),
  end_time: z.string().min(5),
  session_type: z.enum(["ONLINE", "IN_PERSON"]).default("ONLINE"),
  location_note: z.string().max(200).optional(),
  amount: z.number().min(0),
});

const attachReceiptSchema = z.object({
  transaction_ref: z.string().min(3).max(120).optional(),
});

const updateBookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),
});

module.exports = {
  createBookingSchema,
  attachReceiptSchema,
  updateBookingStatusSchema,
};

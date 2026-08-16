const router = require("express").Router();
const { uploadReceipt } = require("../../config/upload");
const {
  createFamilyBooking,
  attachReceipt,
  listBookings,
  getBookingById,
  updateBookingStatus,
} = require("./bookings.controller");
const { authRequired, requireRole } = require("../../middleware/authRequired");

router.post(
  "/bookings",
  authRequired,
  requireRole("FAMILY"),
  createFamilyBooking,
);

router.post(
  "/bookings/:id/receipt",
  authRequired,
  requireRole("FAMILY"),
  uploadReceipt.single("receipt"),
  attachReceipt,
);

// Family: list own bookings
router.get("/bookings", authRequired, requireRole("FAMILY"), listBookings);

// Get single booking (family/tutor/admin) - auth only, controller enforces ownership
router.get("/bookings/:id", authRequired, getBookingById);

// Admin: update booking status
router.patch(
  "/bookings/:id/status",
  authRequired,
  requireRole("ADMIN"),
  updateBookingStatus,
);

module.exports = router;

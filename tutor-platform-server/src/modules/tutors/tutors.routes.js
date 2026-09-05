const router = require("express").Router();
const {
  getMyTutorProfile,
  updateMyTutorProfile,
  updateTutorAvailability,
  listPublicTutors,
  getPublicTutorById,
} = require("./tutors.controller");
const { authRequired, requireRole } = require("../../middleware/authRequired");
const { listBookings } = require("../bookings/bookings.controller");
// REMOVED: uploadTutorApplication import (Multer is no longer needed here)

// Protected tutor routes first
router.get("/profile", authRequired, requireRole("TUTOR"), getMyTutorProfile);

// UPDATED: Removed uploadTutorApplication.fields middleware
router.patch(
  "/profile",
  authRequired,
  requireRole("TUTOR"),
  updateMyTutorProfile,
);

router.patch(
  "/profile/availability",
  authRequired,
  requireRole("TUTOR"),
  updateTutorAvailability,
);

// Tutor: list own bookings
router.get("/bookings", authRequired, requireRole("TUTOR"), listBookings);

// Public routes after
router.get("/", listPublicTutors);
router.get("/:id", getPublicTutorById);

module.exports = router;
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
const { uploadTutorApplication } = require("../../middleware/uploadTutorApplication");

// protected tutor routes first
router.get("/profile", authRequired, requireRole("TUTOR"), getMyTutorProfile);

router.patch(
  "/profile",
  authRequired,
  requireRole("TUTOR"),
  uploadTutorApplication.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "certifications", maxCount: 8 },
  ]),
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

// public routes after
router.get("/", listPublicTutors);
router.get("/:id", getPublicTutorById);

module.exports = router;

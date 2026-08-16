const express = require("express");
const router = express.Router();

const {
  getTutors,
  getFamilies,
  setUserActive,
  getPendingTutors,

  approveTutor,

  rejectTutor,

  getDashboard,
  getRecentBookings,
  getRevenueSummary,
  getPendingPayments,
  approvePayment,
  rejectPayment,
  getPendingRequests,
  approveRequest,
  rejectRequest,
} = require("./admin.controller");
const {
  listBookings,
  updateBookingStatus,
} = require("../bookings/bookings.controller");

const { authRequired, requireRole } = require("../../middleware/authRequired");

router.get("/dashboard", getDashboard);
router.get(
  "/dashboard/recent-bookings",
  authRequired,
  requireRole("ADMIN"),
  getRecentBookings,
);
router.get(
  "/dashboard/revenue",
  authRequired,
  requireRole("ADMIN"),
  getRevenueSummary,
);

// Every admin route requires login
router.use(authRequired);

// Every admin route requires ADMIN role
router.use(requireRole("ADMIN"));

router.get("/tutors", getTutors);

router.get("/families", getFamilies);

router.patch("/users/:id/active", setUserActive);

// Get all tutors waiting for approval
router.get("/tutors/pending", getPendingTutors);

// Approve tutor
router.patch("/tutors/:id/approve", approveTutor);

// Reject tutor
router.patch("/tutors/:id/reject", rejectTutor);

router.get("/payments/pending", getPendingPayments);

router.patch("/payments/:id/approve", approvePayment);

router.patch("/payments/:id/reject", rejectPayment);

router.get("/requests/pending", getPendingRequests);

router.patch("/requests/:id/approve", approveRequest);

router.patch("/requests/:id/reject", rejectRequest);

// Admin: list all bookings
router.get("/bookings", listBookings);

// Admin: update booking status
router.patch("/bookings/:id/status", updateBookingStatus);

module.exports = router;

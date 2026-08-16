const router = require("express").Router();
const { authRequired, optionalAuth, requireRole } = require("../../middleware/authRequired");
const {
  createFeedback,
  listFeedback,
  removeFeedback,
} = require("./feedback.controller");

// Create feedback (public, or attributed when a family/tutor is signed in)
router.post("/", optionalAuth, createFeedback);

// Admin: list all feedback
router.get("/", authRequired, requireRole("ADMIN"), listFeedback);

// Admin: delete feedback
router.delete("/:id", authRequired, requireRole("ADMIN"), removeFeedback);

module.exports = router;

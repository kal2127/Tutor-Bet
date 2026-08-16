const router = require("express").Router();
const {
  createJobPost,
  listMyJobPosts,
  listOpenJobPostsForTutors,
  applyToJobPost,
  listApplicationsForMyJob,
  selectTutorApplication,
} = require("./jobPosts.controller");
const { authRequired, requireRole } = require("../../middleware/authRequired");
const uploadRequestReceipt = require("../../middleware/uploadRequestReceipt");

// family routes
router.post(
  "/family/job-posts",
  authRequired,
  requireRole("FAMILY"),
  uploadRequestReceipt.single("request_payment_receipt"),
  createJobPost,
);

router.get(
  "/family/job-posts",
  authRequired,
  requireRole("FAMILY"),
  listMyJobPosts,
);

router.get(
  "/family/job-posts/:id/applications",
  authRequired,
  requireRole("FAMILY"),
  listApplicationsForMyJob,
);

router.patch(
  "/family/job-posts/:jobId/applications/:applicationId/select",
  authRequired,
  requireRole("FAMILY"),
  selectTutorApplication,
);

// tutor routes
router.get(
  "/tutor/job-posts",
  authRequired,
  requireRole("TUTOR"),
  listOpenJobPostsForTutors,
);

router.post(
  "/tutor/job-posts/:id/apply",
  authRequired,
  requireRole("TUTOR"),
  applyToJobPost,
);

module.exports = router;

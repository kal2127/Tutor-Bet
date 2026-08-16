const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");
const { query } = require("./db/query");
const authenticate_routes = require("./modules/auth/auth.routes");
const path = require("path");
const bookingsRoutes = require("./modules/bookings/bookings.routes");
const tutorRoutes = require("./modules/tutors/tutors.routes");
const jobPostRoutes = require("./modules/job-posts/jobPosts.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const paymentRoutes = require("./payment/payment.routes");
const feedbackRoutes = require("./modules/feedback/feedback.routes");
const app = express();

app.use(cors());
app.use(express.json());
// security headers
const securityHeaders = require("./middleware/securityHeaders");
app.use(securityHeaders);

// response helpers to standardize API shapes
const responseFormatter = require("./middleware/responseFormatter");
app.use(responseFormatter);
// health check
app.get("/health", async (req, res, next) => {
  try {
    const rows = await query("SELECT 1 AS ok");
    res.json({ success: true, rows });
  } catch (e) {
    next(e);
  }
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/family", bookingsRoutes);
app.use("/admin", adminRoutes);
app.use("/admin", bookingsRoutes);
app.use("/", bookingsRoutes);
app.use("/tutor", tutorRoutes);
app.use("/tutor", bookingsRoutes);
app.use("/jobPost", jobPostRoutes);
app.use("/", paymentRoutes);
app.use("/feedback", feedbackRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/auth", authenticate_routes);
app.use(errorHandler);

module.exports = app;

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
const securityHeaders = require("./middleware/securityHeaders");
const responseFormatter = require("./middleware/responseFormatter");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*", // Allow your frontend domain
    credentials: true,
  })
);

// Parses incoming JSON payloads (Cloudinary image URLs arrive as JSON strings)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Security headers & response formatters
app.use(securityHeaders);
app.use(responseFormatter);

// Health check
app.get("/health", async (req, res, next) => {
  try {
    const rows = await query("SELECT 1 AS ok");
    res.json({ success: true, rows });
  } catch (e) {
    next(e);
  }
});

// Serve legacy uploads folder if needed for old local files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Module Routes
app.use("/family", bookingsRoutes);
app.use("/admin", adminRoutes);
app.use("/admin", bookingsRoutes);
app.use("/", bookingsRoutes);
app.use("/tutor", tutorRoutes);
app.use("/tutor", bookingsRoutes);
app.use("/jobPost", jobPostRoutes);
app.use("/", paymentRoutes);
app.use("/feedback", feedbackRoutes);

app.use("/auth", authenticate_routes);
app.use(errorHandler);

module.exports = app;
const HttpError = require("../utils/httpError");
const logger = require("../utils/logger");

function errorHandler(err, req, res, next) {
  // Zod validation errors -> 400
  if (err && err.name === "ZodError") {
    const details = err.issues || err.errors || [];
    logger.warn("Validation error", details);
    return res.status(400).json({
      success: false,
      message: "Validation error",
      details,
    });
  }

  if (err instanceof HttpError) {
    logger.info({ msg: err.message, status: err.statusCode });
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details || null,
    });
  }

  // Unexpected errors
  logger.error(err && err.stack ? err.stack : err);
  return res
    .status(500)
    .json({ success: false, message: "Internal Server Error" });
}

module.exports = errorHandler;

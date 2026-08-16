const HttpError = require("../../utils/httpError");
const feedbackService = require("./feedback.service");
const { createFeedbackSchema } = require("./feedback.validators");

async function createFeedback(req, res, next) {
  try {
    const data = createFeedbackSchema.parse(req.body);

    if (req.user && !["FAMILY", "TUTOR"].includes(req.user.role)) {
      throw new HttpError(403, "Only families or tutors can submit feedback");
    }

    const result = await feedbackService.createFeedback(
      req.user?.id || null,
      req.user?.role || "VISITOR",
      data.booking_id,
      data,
    );

    return res.created(result, "Feedback submitted");
  } catch (err) {
    next(err);
  }
}

async function listFeedback(req, res, next) {
  try {
    const rows = await feedbackService.getAllFeedback();
    return res.ok(rows, "Feedback fetched");
  } catch (err) {
    next(err);
  }
}

async function removeFeedback(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      throw new HttpError(400, "Invalid feedback id");

    const result = await feedbackService.deleteFeedback(id);
    return res.ok(result, "Feedback deleted");
  } catch (err) {
    next(err);
  }
}

module.exports = { createFeedback, listFeedback, removeFeedback };

const HttpError = require("../utils/httpError");
const paymentService = require("./payment.service");
const { createPaymentSchema } = require("./payment.validator");

async function createPayment(req, res, next) {
  try {
    const data = createPaymentSchema.parse(req.body);

    const receiptPath = req.file ? req.file.path : null;

    const paymentId = await paymentService.createPayment(
      req.params.jobId,
      req.user.id,
      data.transaction_id,
      receiptPath,
    );

    return res.created({ paymentId }, "Payment created successfully.");
  } catch (err) {
    next(err);
  }
}

async function listMyPayments(req, res, next) {
  try {
    const rows = await paymentService.listPaymentsForStudent(req.user.id);
    return res.ok(rows, "Payments fetched");
  } catch (err) {
    next(err);
  }
}

async function getPayment(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, "Invalid id");
    }

    const payment = await paymentService.getPaymentById(id, req.user.id);
    if (!payment) {
      throw new HttpError(404, "Payment not found");
    }

    return res.ok(payment, "Payment fetched");
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPayment,
  listMyPayments,
  getPayment,
};

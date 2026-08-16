const express = require("express");

const router = express.Router();

const { authRequired } = require("../middleware/authRequired");
const uploadReceipt = require("../middleware/uploadReciept");
const { createPayment } = require("./payment.controller");
router.post(
  "/jobs/:jobId/payment",
  authRequired,
  uploadReceipt.single("receipt"),
  createPayment,
);
const { listMyPayments, getPayment } = require("./payment.controller");

router.get("/payments", authRequired, listMyPayments);
router.get("/payments/:id", authRequired, getPayment);
module.exports = router;

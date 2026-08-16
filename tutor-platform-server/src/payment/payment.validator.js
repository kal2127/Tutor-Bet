const { z } = require("zod");

const createPaymentSchema = z.object({
  transaction_id: z.string().optional(),
});

module.exports = {
  createPaymentSchema,
};

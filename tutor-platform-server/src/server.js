const env = require("./config/env");
const app = require("./app");
const logger = require("./utils/logger");
// 1. Import the verification function from your email service
const { verifyTransporter } = require("./services/email.service");

app.listen(env.port, async () => {
  logger.info(`API running on http://localhost:${env.port}`);

  // 2. Test the email connection as soon as the server runs
  await verifyTransporter();
});

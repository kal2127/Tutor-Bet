const nodemailer = require("nodemailer");
const env = require("../config/env");
const logger = require("../utils/logger");

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST ? env.EMAIL_HOST.trim() : "smtp.gmail.com",
  port: Number(env.EMAIL_PORT) || 587,
  secure: Number(env.EMAIL_PORT) === 465, // false for 587
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: env.EMAIL_USER
    ? {
        user: env.EMAIL_USER.trim(),
        pass: env.EMAIL_PASS ? env.EMAIL_PASS.trim() : "",
      }
    : undefined,
});

function brandedFrom(value) {
  const configured = value.trim();
  const bracketMatch = configured.match(/<([^>]+)>/);
  const address = bracketMatch ? bracketMatch[1].trim() : configured;
  return `"Tutor ቤት" <${address}>`;
}

async function verifyTransporter() {
  try {
    await transporter.verify();
    logger.info("Email transporter verified");
    return true;
  } catch (err) {
    logger.error("Email transporter verification failed:", err.message);
    return false;
  }
}

async function sendEmail({ to, subject, html, text }) {
  if (!env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM not configured");
  }

  const mail = {
    from: brandedFrom(env.EMAIL_FROM),
    to,
    subject,
    html,
    text,
  };

  const info = await transporter.sendMail(mail);
  logger.info("Email send result", {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  });
  return info;
}

// Safe send that never throws — logs failures and returns boolean
async function sendEmailSafely(options) {
  try {
    await sendEmail(options);
    return true;
  } catch (error) {
    logger.error("Email sending failed:", error?.message || error);
    return false;
  }
}

// Simple templated email helper
function renderTemplate(templateName, vars = {}) {
  // Minimal templating via replacements: {{key}}
  const templates = {
    generic: (v) => `<p>${v.body || ""}</p>`,
  };

  const fn = templates[templateName] || templates.generic;
  return fn(vars);
}

async function sendTemplatedEmail({
  to,
  subject,
  template = "generic",
  vars = {},
}) {
  const html = renderTemplate(template, vars);
  return sendEmailSafely({ to, subject, html });
}

module.exports = {
  sendEmail,
  sendEmailSafely,
  verifyTransporter,
  sendTemplatedEmail,
};

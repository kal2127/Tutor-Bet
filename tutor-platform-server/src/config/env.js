const dotenv = require("dotenv");
dotenv.config();

function required(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "5000")),

  db: {
    host: required("DB_HOST"),
    port: Number(optional("DB_PORT", "3306")),
    user: required("DB_USER"),
    password: optional("DB_PASSWORD", ""),
    name: required("DB_NAME"),
    connectionLimit: Number(optional("DB_CONNECTION_LIMIT", "10")),
  },

  jwt: {
    secret: required("JWT_SECRET"),
  },
  google: {
    clientId: optional("GOOGLE_CLIENT_ID", ""),
  },
  app: {
    frontendUrl: optional("FRONTEND_URL", "http://localhost:8080"),
  },
  EMAIL_HOST: required("EMAIL_HOST"),
  EMAIL_PORT: required("EMAIL_PORT"),
  EMAIL_USER: required("EMAIL_USER"),
  EMAIL_PASS: required("EMAIL_PASS").replace(/\s+/g, ""),
  EMAIL_FROM: required("EMAIL_FROM"),
};

module.exports = env;

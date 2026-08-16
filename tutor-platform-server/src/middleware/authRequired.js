const jwt = require("jsonwebtoken");
const env = require("../config/env");
const HttpError = require("../utils/httpError");
const { query } = require("../db/query");

async function authRequired(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(new HttpError(401, "Missing token"));
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    const users = await query(
      "SELECT id, role, is_active FROM users WHERE id = ? LIMIT 1",
      [payload.sub],
    );

    if (!users.length) {
      return next(new HttpError(401, "User account no longer exists"));
    }

    if (!users[0].is_active) {
      return next(new HttpError(403, "User account is disabled"));
    }

    req.user = {
      id: users[0].id,
      role: users[0].role || payload.role,
    };
    next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    next(new HttpError(401, "Invalid or expired token"));
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next();
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = {
      id: payload.sub,
      role: payload.role,
    };
  } catch {
    req.user = null;
  }

  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, "Unauthorized"));
    if (req.user.role !== role) return next(new HttpError(403, "Forbidden"));
    next();
  };
}

module.exports = { authRequired, optionalAuth, requireRole };

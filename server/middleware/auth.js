const path = require("path");
const jwt = require("jsonwebtoken");
const { getPool } = require("../db");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "localfarm_jwt_super_secret_key_2026";

/**
 * Middleware: Authenticate JWT Token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please provide a valid token.",
    });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired session. Please log in again.",
      });
    }

    req.user = decoded;

    // Check if session was revoked remotely
    if (decoded.sessionId) {
      try {
        const pool = getPool();
        const { rows } = await pool.query(
          "SELECT is_active FROM user_sessions WHERE id = $1 LIMIT 1",
          [decoded.sessionId]
        );
        if (rows.length > 0 && rows[0].is_active === false) {
          return res.status(401).json({
            success: false,
            message: "Your session has been terminated from another device. Please log in again.",
          });
        }
      } catch (dbErr) {
        console.warn("[Auth Session Check Warning]", dbErr.message);
      }
    }

    next();
  });
}

/**
 * Middleware: Require Admin Role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access forbidden: Administrator privileges required.",
    });
  }
  next();
}

/**
 * Middleware: Require User Role
 */
function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }
  next();
}

/**
 * Middleware: Request Logger
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireAdmin,
  requireUser,
  requestLogger,
};

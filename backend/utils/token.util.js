const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// ===== ACCESS TOKEN =====
function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.ACCESS_SECRET, { expiresIn: "15m" });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.ACCESS_SECRET);
}

// ===== REFRESH TOKEN =====
function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.REFRESH_SECRET, { expiresIn: "7d" });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.REFRESH_SECRET);
}

// ===== HASH =====
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};

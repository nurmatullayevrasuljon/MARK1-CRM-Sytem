const express = require("express");
const {
  signup,
  verify,
  signin,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  resendOtp,

} = require("../controllers/store.controller");
const { signinUser, refreshUser, logoutUser } = require("../controllers/user.controller");
const { authLimiter } = require("../middlewares/rateLimit.middleware");
const router = express.Router();

// OTP/SMS bilan ishladigan barcha endpointlar — eng qat'iy limit
// (SMS pumping va kod "dazmoli" himoyasi).
router.post("/store/signup", authLimiter, signup);
router.post("/store/verify", authLimiter, verify);
router.post("/store/forgot-password", authLimiter, forgotPassword);
router.post("/store/reset-password", authLimiter, resetPassword);
router.post("/store/resend-otp", authLimiter, resendOtp);

// Kirish — biroz yengilroq, lekin baribir limitlangan (parol tanlash).
router.post("/store/signin", authLimiter, signin);
router.post("/user/signin", authLimiter, signinUser);

// Token yangilash va chiqish — umumiy API limiti yetarli.
router.post("/store/refresh", refresh);
router.post("/store/logout", logout);
router.post("/user/refresh", refreshUser);
router.post("/user/logout", logoutUser);

module.exports = router;

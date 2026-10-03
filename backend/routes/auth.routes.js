const express = require("express");
const {
  signup,
  verify,
  signin,
  refresh,
  forgotPassword,
  resetPassword,
<<<<<<< HEAD
  resendOtp,
=======
>>>>>>> 4d9fe8d9bfa7ef6f92f4e2c5a4ba664385ffe379
} = require("../controllers/store.controller");
const { signinUser, refreshUser } = require("../controllers/user.controller");
const router = express.Router();

router.post("/store/signup", signup);
router.post("/store/verify", verify);
router.post("/store/refresh", refresh);
router.post("/store/signin", signin);
router.post("/store/forgot-password", forgotPassword);
router.post("/store/reset-password", resetPassword);
<<<<<<< HEAD
router.post("/store/resend-otp", resendOtp);
=======
>>>>>>> 4d9fe8d9bfa7ef6f92f4e2c5a4ba664385ffe379

router.post("/user/signin", signinUser);
router.post("/user/refresh", refreshUser);

module.exports = router;

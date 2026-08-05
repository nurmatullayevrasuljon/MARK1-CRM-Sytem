const express = require("express");
const {
  signup,
  verify,
  signin,
  refresh,
  forgotPassword,
  resetPassword,
} = require("../controllers/store.controller");
const { signinUser, refreshUser } = require("../controllers/user.controller");
const router = express.Router();

router.post("/store/signup", signup);
router.post("/store/verify", verify);
router.post("/store/refresh", refresh);
router.post("/store/signin", signin);
router.post("/store/forgot-password", forgotPassword);
router.post("/store/reset-password", resetPassword);

router.post("/user/signin", signinUser);
router.post("/user/refresh", refreshUser);

module.exports = router;

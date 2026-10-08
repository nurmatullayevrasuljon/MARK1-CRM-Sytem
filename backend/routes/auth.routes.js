const express = require("express");
const {
  signup,
  verify,
  signin,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} = require("../controllers/store.controller");
const { signinUser, refreshUser, logoutUser } = require("../controllers/user.controller");
const router = express.Router();

router.post("/store/signup", signup);
router.post("/store/verify", verify);
router.post("/store/refresh", refresh);
router.post("/store/signin", signin);
router.post("/store/logout", logout);
router.post("/store/forgot-password", forgotPassword);
router.post("/store/reset-password", resetPassword);

router.post("/user/signin", signinUser);
router.post("/user/refresh", refreshUser);
router.post("/user/logout", logoutUser);

module.exports = router;

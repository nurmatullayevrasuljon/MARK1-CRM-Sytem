const express = require("express");
const {
  updateProfile,
  getProfile,
  changePassword,
} = require("../controllers/store.controller");
const router = express.Router();

router.post("/profile/update", updateProfile);
router.get("/profile/get", getProfile);
router.put("/password/change", changePassword);

module.exports = router;

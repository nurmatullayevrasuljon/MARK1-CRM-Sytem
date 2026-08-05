const express = require("express");
const {
  updateProfile,
  getProfile,
} = require("../controllers/store.controller");
const router = express.Router();

router.post("/profile/update", updateProfile);
router.get("/profile/get", getProfile);

module.exports = router;

// backend/routes/app.routes.js
const express = require("express");
const router = express.Router();
const { getAppVersion } = require("../controllers/app.controller");

router.get("/version", getAppVersion);

module.exports = router;

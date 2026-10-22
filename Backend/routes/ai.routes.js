const express = require("express");
const { getAiOverview } = require("../controllers/aioverview.controller");
const router = express.Router();

router.get("/overview", getAiOverview);

module.exports = router;

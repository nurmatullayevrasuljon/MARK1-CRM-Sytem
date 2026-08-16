const express = require("express");
const {
  getStatistics,
  getWeeklyTrend,
  getDailyRevenue,
} = require("../controllers/statistics.controller");
const router = express.Router();

router.get("/full", getStatistics);
router.get("/weekly-trend", getWeeklyTrend);
router.get("/daily-revenue", getDailyRevenue);

module.exports = router;

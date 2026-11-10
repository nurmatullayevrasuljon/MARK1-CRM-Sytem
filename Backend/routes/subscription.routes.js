const express = require("express");
const ctrl = require("../controllers/subscription.controller");
const router = express.Router();

router.get("/plans", ctrl.listPlans);
router.get("/current", ctrl.getCurrent);
router.post("/purchase", ctrl.purchase);

module.exports = router;
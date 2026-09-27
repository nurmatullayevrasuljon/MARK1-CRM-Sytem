const express = require("express");
const { getDebts } = require("../controllers/debt.controller");
const router = express.Router();

router.get("/get", getDebts);

module.exports = router;

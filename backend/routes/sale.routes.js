const express = require("express");
const {
  createSale,
  cancelSale,
  returnSale,
  addPayment,
  getSales,
} = require("../controllers/sale.controller");
const router = express.Router();

router.post("/create", createSale);
router.delete("/cancel", cancelSale);
router.put("/return", returnSale);
router.post("/payment/add", addPayment);
router.get("/get", getSales);

module.exports = router;

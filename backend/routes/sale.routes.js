const express = require("express");
const {
  createSale,
  cancelSale,
  returnSale,
  addPayment,
  getSales,
  exportSales,
  sendManualReminder,
} = require("../controllers/sale.controller");
const router = express.Router();

router.post("/create", createSale);
router.delete("/cancel", cancelSale);
router.put("/return", returnSale);
router.post("/payment/add", addPayment);
router.get("/get", getSales);
router.get("/export", exportSales);
router.post("/remind", sendManualReminder); // ?sale_id=ObjectId

module.exports = router;

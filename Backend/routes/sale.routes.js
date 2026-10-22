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
const { smsLimiter } = require("../middlewares/rateLimit.middleware");

router.post("/create", createSale);
router.delete("/cancel", cancelSale);
router.put("/return", returnSale);
router.post("/payment/add", addPayment);
router.get("/get", getSales);
router.get("/export", exportSales);
// SMS yuboradi — limitlanmagan bo'lsa DevSMS hisobidan pul ketadi.
router.post("/remind", smsLimiter, sendManualReminder); // ?sale_id=ObjectId

module.exports = router;

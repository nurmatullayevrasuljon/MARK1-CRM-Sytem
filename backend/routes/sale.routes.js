const express = require("express");
const {
  createSale,
  cancelSale,
  returnSale,
  addPayment,
  getSales,
  exportSales,
} = require("../controllers/sale.controller");
const router = express.Router();

router.post("/create", createSale);
router.delete("/cancel", cancelSale);
router.put("/return", returnSale);
router.post("/payment/add", addPayment);
router.get("/get", getSales);
router.get("/export", exportSales);

module.exports = router;

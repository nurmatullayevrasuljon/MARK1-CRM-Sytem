const express = require("express");
const { checkRole } = require("../middlewares/role.middleware");
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  addStock,
<<<<<<< HEAD
=======
  getProductByBarcode,
>>>>>>> 4d9fe8d9bfa7ef6f92f4e2c5a4ba664385ffe379
} = require("../controllers/product.controller");
const router = express.Router();

router.post("/create", checkRole(["ceo", "admin"]), createProduct);
router.put("/update", checkRole(["ceo", "admin"]), updateProduct);
router.put("/add", checkRole(["ceo", "admin"]), addStock);
router.delete("/delete", checkRole(["ceo", "admin"]), deleteProduct);
router.get("/get", getProducts);
<<<<<<< HEAD
=======
// YANGI: sotuv ekranidagi skanerlash uchun aniq shtrix-kod qidiruvi
router.get("/barcode/:barcode", getProductByBarcode);
>>>>>>> 4d9fe8d9bfa7ef6f92f4e2c5a4ba664385ffe379

module.exports = router;

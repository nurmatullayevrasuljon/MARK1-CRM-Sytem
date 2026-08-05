const express = require("express");
const { checkRole } = require("../middlewares/role.middleware");
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
} = require("../controllers/product.controller");
const router = express.Router();

router.post("/create", checkRole(["ceo", "admin"]), createProduct);
router.put("/update", checkRole(["ceo", "admin"]), updateProduct);
router.delete("/delete", checkRole(["ceo", "admin"]), deleteProduct);
router.get("/get", getProducts);

module.exports = router;

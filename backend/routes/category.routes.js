const express = require("express");
const {
  createCategory,
  updateCategory,
  getCategory,
  deleteCategory,
} = require("../controllers/category.controller");
const { checkRole } = require("../middlewares/role.middleware");
const router = express.Router();

router.post("/create", checkRole(["ceo", "admin"]), createCategory);
router.put("/update", checkRole(["ceo", "admin"]), updateCategory); // ?category_id=ObjectId
router.get("/get/all", getCategory);
router.delete("/delete", checkRole(["ceo", "admin"]), deleteCategory); // ?category_id=ObjectId

module.exports = router;

const express = require("express");
const {
  createCategory,
  updateCategory,
  getCategory,
  deleteCategory,
} = require("../controllers/category.controller");
const router = express.Router();

router.post("/create", createCategory);
router.put("/update", updateCategory); // ?category_id=ObjectId
router.get("/get/all", getCategory);
router.delete("/delete", deleteCategory); // ?category_id=ObjectId

module.exports = router;

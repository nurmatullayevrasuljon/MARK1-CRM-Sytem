const express = require("express");
const {
  createUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getUserByPhone,
  getUserById,
  getProfile,
} = require("../controllers/user.controller");
const { checkRole } = require("../middlewares/role.middleware");
const router = express.Router();

router.post("/create", checkRole(["ceo"]), createUser);
router.put("/update", checkRole(["ceo"]), updateUser); // ?user_id=ObjectId
router.delete("/delete", checkRole(["ceo"]), deleteUser); // ?user_id=ObjectId
router.get("/get/all", checkRole(["ceo"]), getAllUsers);
router.get("/get/phone", checkRole(["ceo"]), getUserByPhone); // ?user_phone=Number
router.get("/get/id", checkRole(["ceo"]), getUserById); // ?user_id=ObjectId
router.get("/profile/get", checkRole(["ceo", "admin", "seller"]), getProfile);

module.exports = router;

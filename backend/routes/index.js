const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");

const authRoutes = require("./auth.routes");
const storeRoutes = require("./store.routes");
const userRoutes = require("./user.routes");
const fileRoutes = require("./file.routes");
const categoryRoutes = require("./category.routes");
const productRoutes = require("./product.routes");
const clientRoutes = require("./client.routes");
const saleRoutes = require("./sale.routes");
const debtRoutes = require("./debt.routes");
const statisticsRoutes = require("./statistics.route");
const { checkRole } = require("../middlewares/role.middleware");

router.use("/auth", authRoutes);
router.use("/store", authMiddleware, checkRole(["ceo"]), storeRoutes);
router.use("/user", authMiddleware, userRoutes);
router.use("/file", authMiddleware, checkRole(["ceo"]), fileRoutes);
router.use("/category", authMiddleware, categoryRoutes);
router.use("/product", authMiddleware, productRoutes);
router.use("/client", authMiddleware, clientRoutes);
router.use("/sale", authMiddleware, saleRoutes);
router.use("/debt", authMiddleware, debtRoutes);
router.use(
  "/statistics",
  authMiddleware,
  checkRole(["ceo", "admin"]),
  statisticsRoutes,
);

module.exports = router;

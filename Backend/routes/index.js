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
const aiRoutes = require("./ai.routes");
const appRoutes = require("./app.routes");
const paymentRoutes = require("./payment.routes");
const subscriptionRoutes = require("./subscription.routes");

const paymentCtrl = require("../controllers/payment.controller");
const { requirePlan } = require("../middlewares/plan.middleware");


const statisticsRoutes = require("./statistics.route");
const { checkRole } = require("../middlewares/role.middleware");

router.use("/auth", authRoutes);
router.use("/app", appRoutes);
router.use("/store", authMiddleware, checkRole(["ceo"]), storeRoutes);

router.post("/payment/webhook", paymentCtrl.webhook);
router.use("/payment", authMiddleware, checkRole(["ceo"]), paymentRoutes);
router.use("/subscription", authMiddleware, checkRole(["ceo"]), subscriptionRoutes);


router.use("/user", authMiddleware,requirePlan(), userRoutes);
router.use("/file", authMiddleware, checkRole(["ceo"]), fileRoutes);

router.use("/category", authMiddleware, requirePlan({ allowRead: true }), categoryRoutes);
router.use("/product", authMiddleware, requirePlan({ allowRead: true }), productRoutes);
router.use("/client", authMiddleware, requirePlan({ allowRead: true }), clientRoutes);
router.use("/sale", authMiddleware, requirePlan({ allowRead: true }), saleRoutes);
router.use("/debt", authMiddleware, requirePlan({ allowRead: true }), debtRoutes);

router.use("/ai", authMiddleware, checkRole(["ceo"]), requirePlan(), aiRoutes);

router.use(
  "/statistics",
  authMiddleware,
  checkRole(["ceo", "admin"]),
  requirePlan(),
  statisticsRoutes,
);

module.exports = router;

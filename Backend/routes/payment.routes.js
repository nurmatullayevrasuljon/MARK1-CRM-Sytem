const express = require("express");
const ctrl = require("../controllers/payment.controller");
const router = express.Router();

// Webhook bu yerda EMAS: u auth'siz bo'lishi kerak, routes/index.js da alohida ulanadi.

router.post("/create", ctrl.createPayment);
router.get("/active", ctrl.getActivePayment); // "/:id" dan oldin turishi shart
router.get("/", ctrl.listPayments);
router.get("/:id", ctrl.getPayment);
router.post("/:id/cancel", ctrl.cancelPayment);

module.exports = router;

/* ======================================================================
   routes/index.js: faqat shu o'zgarish (prepare/complete o'rniga webhook):

   const paymentCtrl = require("../controllers/payment.controller");

   // TezCheck webhook: auth YO'Q, imzo controller ichida tekshiriladi
   router.post("/payment/webhook", paymentCtrl.webhook);
   router.use("/payment", authMiddleware, checkRole(["ceo"]), paymentRoutes);

   ======================================================================
   app.js / server.js: webhook imzosi XOM baytlar ustidan hisoblanadi, shuning uchun
   mavjud express.json() ni shunday almashtiring:

   app.use(
     express.json({
       verify: (req, _res, buf) => {
         req.rawBody = buf;
       },
     }),
   );

   ======================================================================
   .env

   TEZCHECK_API_KEY=aps_...              # Bearer kalit (maxfiy)
   TEZCHECK_WEBHOOK_SECRET=wbs_...       # kabinetda webhook qo'shganda bir marta ko'rsatiladi
   # Kalit bitta kassaga biriktirilmagan bo'lsa kassa kodini ham yozing:
   # TEZCHECK_CASH_DESK_CODE=cdk_...
   # TEZCHECK_RETURN_URL=https://app.domen.uz/billing   # kabinetdagi ruxsat ro'yxatida bo'lsin
   # PAYMENT_TTL_MINUTES=30
   # Faqat dev: "Test provider" orqali o'tgan to'lov ham balansga qo'shilsin
   # TEZCHECK_ALLOW_TEST=true

   Webhook manzili (kabinetda ro'yxatdan o'tkazing, HTTPS bo'lishi shart):
   https://DOMEN/api/payment/webhook

   Eski Hamyon ma'lumotlari bilan to'qnashmaslik uchun (mongosh):
   db.payments.drop()
   ====================================================================== */
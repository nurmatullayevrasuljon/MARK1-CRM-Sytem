const mongoose = require("mongoose");
const Payment = require("../models/payment.model");
const Store = require("../models/store.model");
const tezcheck = require("../service/tezcheck.service");

const MIN_AMOUNT = Number(process.env.PAYMENT_MIN_AMOUNT || 1000); // so'm (TezCheck standart minimumi ham 1 000 so'm)
const MAX_AMOUNT = Number(process.env.PAYMENT_MAX_AMOUNT || 50000000);
// TezCheck hisobining muddati platforma sozlamasidan keladi (uzoq bo'lishi mumkin),
// shuning uchun o'zimizning qisqa muddatimizni qo'yamiz va tugagach hisobni bekor qilamiz
const PAYMENT_TTL_MS = Number(process.env.PAYMENT_TTL_MINUTES || 30) * 60 * 1000;
const SYNC_INTERVAL_MS = 10 * 1000; // TezCheck limiti: 300 so'rov/daqiqa
const RETURN_URL = process.env.TEZCHECK_RETURN_URL || null; // kabinetdagi ruxsat ro'yxatida bo'lishi kerak

// Test provayderi orqali o'tgan to'lov haqiqiy pul emas. Faqat dev'da balansga qo'shish uchun:
const ALLOW_TEST =
  process.env.TEZCHECK_ALLOW_TEST === "true" && process.env.NODE_ENV !== "production";

const ACTIVE = Payment.ACTIVE_STATUSES;

// Mijozga qaytariladigan ko'rinish. payment_url faqat ochiq to'lov uchun beriladi.
const toPublic = (p) => ({
  id: p._id,
  amount: p.amount,
  status: p.status,
  payment_url: p.is_active ? p.payment_url : null,
  expires_at: p.expires_at,
  paid_at: p.paid_at,
  cancel_reason: p.cancel_reason,
  createdAt: p.createdAt,
});

/**
 * To'langan to'lov uchun balansni aynan bir marta to'ldiradi.
 * Webhook, so'rab olish (sync) va qayta yuborilgan webhook'lar bir vaqtda kelsa ham
 * balance_credited bayrog'i atomik o'zgargani uchun balans bir marta oshadi.
 */
async function creditStore(paymentId) {
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: "paid", balance_credited: false },
    { $set: { balance_credited: true } },
    { new: true },
  );
  if (!payment) return false; // allaqachon to'ldirilgan

  try {
    const store = await Store.findByIdAndUpdate(
      payment.store,
      { $inc: { balance: payment.amount } },
      { new: true },
    );
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { balance_after: store ? store.balance : null } },
    );
    return true;
  } catch (err) {
    // Balans oshmadi: bayroqni qaytaramiz, keyingi webhook/sync yana urinadi
    await Payment.updateOne({ _id: payment._id }, { $set: { balance_credited: false } });
    throw err;
  }
}

/**
 * Muvaffaqiyatli to'lovni qayta ishlaydi (webhook va sync uchun umumiy joy).
 * info: { amount_minor, environment, tezcheck_payment_id, provider_code, fee_minor, net_minor, succeeded_at }
 */
async function settlePaid(payment, info) {
  // Hisob qat'iy summali, shuning uchun mos kelmasligi g'ayritabiiy holat
  if (Number(info.amount_minor) !== payment.amount * 100) {
    console.error(
      "[tezcheck] summa mos emas",
      String(payment._id),
      info.amount_minor,
      payment.amount * 100,
    );
    return { credited: false, reason: "amount_mismatch" };
  }

  // Test provayderi: haqiqiy pul emas, balansga qo'shmaymiz
  const isLive = info.environment === "live";
  if (!isLive && !(ALLOW_TEST && info.environment === "test")) {
    await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $in: ACTIVE } },
      {
        $set: {
          status: "failed",
          is_active: false,
          fail_reason: `not_live:${info.environment}`,
          environment: info.environment || null,
        },
      },
    );
    return { credited: false, reason: "not_live" };
  }

  // Faqat bir marta paid ga o'tadi. Bekor qilingan (timeout) to'lov uchun ham pul kelgan bo'lsa
  // paid deb qabul qilamiz, chunki mijoz pulini to'lagan.
  await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: "paid" } },
    {
      $set: {
        status: "paid",
        is_active: false,
        paid_at: info.succeeded_at ? new Date(info.succeeded_at) : new Date(),
        tezcheck_payment_id: info.tezcheck_payment_id || null,
        provider_code: info.provider_code || null,
        environment: info.environment || null,
        fee_minor: info.fee_minor ?? null,
        net_minor: info.net_minor ?? null,
      },
    },
  );
  // paid bo'lgan, lekin balans oshmay qolgan holatlarni ham shu yerda tuzatadi
  const credited = await creditStore(payment._id);
  return { credited };
}

// TezCheck'dan to'lov holatini so'rab olish (webhook kelmay qolsa ham to'lov yo'qolmaydi)
async function syncWithTezcheck(payment) {
  await Payment.updateOne({ _id: payment._id }, { $set: { last_synced_at: new Date() } });
  try {
    const { bill, payment: pay } = await tezcheck.getBill(payment.bill_id);

    // "paid" ni hisob holatidan emas, to'lovdan o'qiymiz
    if (bill && bill.paid && pay && pay.state === "succeeded") {
      await Payment.updateOne(
        { _id: payment._id },
        { $push: { callbacks: { type: "sync", payload: { bill, payment: pay } } } },
      );
      await settlePaid(payment, {
        amount_minor: pay.amount_minor,
        environment: pay.environment,
        tezcheck_payment_id: pay.id,
        provider_code: pay.provider_code,
        fee_minor: pay.fee_minor,
        net_minor: pay.net_minor,
        succeeded_at: pay.succeeded_at,
      });
    } else if (pay && ["processing", "requires_action"].includes(pay.state)) {
      await Payment.updateOne(
        { _id: payment._id, status: "pending" },
        { $set: { status: "processing" } },
      );
    }
  } catch (err) {
    console.error("[tezcheck] sync xatosi:", err.code, err.message, err.requestId || "");
  }
  return Payment.findById(payment._id);
}

// Muddati o'tgan to'lovni yopish: avval TezCheck'da hisobni bekor qilamiz (aks holda mijoz havolani
// keyinroq to'lab yuborishi mumkin)
async function expirePayment(payment, reason = "timeout") {
  if (payment.bill_id) {
    try {
      await tezcheck.cancelBill(payment.bill_id, reason, `cancel-${payment._id}`);
    } catch (err) {
      if (err.status === 404) {
        // hisob topilmadi: bekor qilingan deb hisoblaymiz
      } else if (err.code === "resource.state_invalid") {
        // allaqachon to'langan yoki to'lov jarayonda: bekor qilmaymiz, sync hal qiladi
        return payment;
      } else {
        console.error("[tezcheck] cancel xatosi:", err.code, err.message, err.requestId || "");
        return payment; // keyingi so'rovda yana urinamiz
      }
    }
  }
  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: ACTIVE } },
    { $set: { status: "cancelled", is_active: false, cancel_reason: reason } },
    { new: true },
  );
  return updated || (await Payment.findById(payment._id));
}

// Ochiq to'lovni yangilaydi: sync (throttle bilan) + muddat tekshiruvi
async function refreshPayment(payment, { force = false } = {}) {
  if (!payment.is_active) return payment;

  const stale =
    !payment.last_synced_at || Date.now() - payment.last_synced_at.getTime() > SYNC_INTERVAL_MS;
  if (payment.bill_id && (force || stale)) {
    payment = await syncWithTezcheck(payment);
  }
  if (payment.is_active && payment.expires_at < new Date()) {
    payment = await expirePayment(payment, "timeout");
  }
  return payment;
}

/* ------------------------------------------------------------------ */
/*  Do'kon endpointlari (auth kerak)                                  */
/* ------------------------------------------------------------------ */

// POST /api/payment/create   { amount }   (so'mda, butun son)
exports.createPayment = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const storeId = req.user.store_id;

    if (!Number.isInteger(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Summa ${MIN_AMOUNT.toLocaleString("ru-RU")} dan ${MAX_AMOUNT.toLocaleString("ru-RU")} so'mgacha butun son bo'lishi kerak`,
      });
    }

    const respondWithExisting = async () => {
      const existing = await Payment.findOne({ store: storeId, is_active: true });
      if (!existing) return false;
      const fresh = await refreshPayment(existing, { force: true });
      if (!fresh.is_active) return false; // yangilanish paytida yakunlanib qoldi
      res.status(409).json({
        success: false,
        message: "Sizda yakunlanmagan to'lov bor. Uni tugating yoki bekor qiling",
        payment: toPublic(fresh),
      });
      return true;
    };

    if (await respondWithExisting()) return;

    let payment;
    try {
      payment = await Payment.create({
        store: storeId,
        amount,
        status: "created",
        is_active: true,
        expires_at: new Date(Date.now() + PAYMENT_TTL_MS),
      });
    } catch (err) {
      if (err.code === 11000) {
        // parallel so'rov (ikki marta bosish): ochiq to'lov allaqachon yaratilgan
        if (await respondWithExisting()) return;
        return res.status(409).json({ success: false, message: "To'lov yaratilmoqda, biroz kuting" });
      }
      throw err;
    }

    try {
      const { bill, payment_url } = await tezcheck.createBill({
        amountSom: amount,
        title: `Balansni to'ldirish #${String(payment._id).slice(-6)}`,
        externalReference: String(payment._id),
        returnUrl: RETURN_URL,
        // Qayta urinishda ikkinchi hisob ochilmasligi uchun
        idempotencyKey: `topup-${payment._id}`,
      });

      // payment_url faqat bir marta beriladi: darhol saqlaymiz
      payment.bill_id = bill.id;
      payment.bill_reference = bill.reference;
      payment.payment_url = payment_url;
      payment.status = "pending";
      await payment.save();
    } catch (err) {
      payment.status = "failed";
      payment.is_active = false;
      payment.fail_reason = `${err.code}: ${err.message}`;
      await payment.save();

      console.error("[tezcheck] hisob ochilmadi:", err.code, err.message, err.requestId || "", err.details || "");

      if (err.code === "payment_link.amount_out_of_range") {
        return res.status(400).json({ success: false, message: "Summa to'lov tizimi chegarasidan tashqarida" });
      }
      return res.status(502).json({
        success: false,
        message: "To'lov yaratib bo'lmadi. Birozdan keyin qayta urinib ko'ring",
      });
    }

    return res.status(201).json({ success: true, payment: toPublic(payment) });
  } catch (err) {
    console.error("createPayment:", err);
    return res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

// GET /api/payment/active: sahifa yangilanganda to'lovni davom ettirish uchun
exports.getActivePayment = async (req, res) => {
  try {
    let payment = await Payment.findOne({ store: req.user.store_id, is_active: true });
    if (payment) payment = await refreshPayment(payment);
    return res.json({
      success: true,
      payment: payment && payment.is_active ? toPublic(payment) : null,
    });
  } catch (err) {
    console.error("getActivePayment:", err);
    return res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

// GET /api/payment/:id: frontend shu endpointni polling qiladi
exports.getPayment = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri ID" });
    }
    let payment = await Payment.findOne({ _id: req.params.id, store: req.user.store_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: "To'lov topilmadi" });
    }
    payment = await refreshPayment(payment);

    const store = await Store.findById(req.user.store_id).select("balance");
    return res.json({
      success: true,
      payment: toPublic(payment),
      balance: store ? store.balance : null,
    });
  } catch (err) {
    console.error("getPayment:", err);
    return res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

// GET /api/payment?page=1&limit=10
exports.listPayments = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

    const filter = { store: req.user.store_id, status: { $ne: "created" } };
    const [items, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      payments: items.map(toPublic),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("listPayments:", err);
    return res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

// POST /api/payment/:id/cancel
exports.cancelPayment = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri ID" });
    }
    let payment = await Payment.findOne({ _id: req.params.id, store: req.user.store_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: "To'lov topilmadi" });
    }

    // Bekor qilishdan oldin to'lanib qolmaganini tekshiramiz
    payment = await refreshPayment(payment, { force: true });
    if (!payment.is_active) {
      return res.status(409).json({
        success: false,
        message: "Bu to'lov allaqachon yakunlangan",
        payment: toPublic(payment),
      });
    }

    const result = await expirePayment(payment, "user");
    if (result.is_active) {
      return res.status(409).json({
        success: false,
        message: "To'lov hozir jarayonda. Bir ozdan keyin qayta urinib ko'ring",
      });
    }

    return res.json({ success: true, payment: toPublic(result) });
  } catch (err) {
    console.error("cancelPayment:", err);
    return res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ------------------------------------------------------------------ */
/*  TezCheck webhook: auth YO'Q, HMAC imzo bilan himoyalangan         */
/* ------------------------------------------------------------------ */

async function findPaymentFromWebhook(d) {
  let payment = null;
  if (d.external_reference && mongoose.isValidObjectId(d.external_reference)) {
    payment = await Payment.findById(d.external_reference);
  }
  if (!payment && d.bill_id) payment = await Payment.findOne({ bill_id: d.bill_id });

  // Begona hisobning hodisasi bizning to'lovga tegib ketmasligi uchun
  if (payment && d.bill_id && payment.bill_id && payment.bill_id !== d.bill_id) return null;
  return payment;
}

// POST /api/payment/webhook
exports.webhook = async (req, res) => {
  try {
    if (!tezcheck.verifyWebhook(req)) {
      console.warn("[tezcheck] webhook: noto'g'ri imzo");
      return res.status(401).json({ success: false, message: "Imzo noto'g'ri" });
    }

    const event = req.body || {};
    const d = event.data || {};

    // Boshqa turdagi hodisalar yoki bizniki bo'lmagan to'lovlar: 200 qaytaramiz (qayta urinish kerak emas)
    if (typeof event.type !== "string" || !event.type.startsWith("payment.")) {
      return res.status(200).json({ success: true, ignored: true });
    }
    const payment = await findPaymentFromWebhook(d);
    if (!payment) {
      return res.status(200).json({ success: true, ignored: true });
    }

    await Payment.updateOne(
      { _id: payment._id },
      {
        $push: {
          callbacks: {
            type: event.type,
            event_id: event.id,
            payload: { id: event.id, data: d },
          },
        },
      },
    );

    // Natijasi noma'lum to'lovda hech narsa qilmaymiz (tovar bermaymiz ham, bekor ham qilmaymiz);
    // TezCheck solishtirgach vebhuk yoki sync natijani aytadi
    if (d.problem && d.problem.unknown_reason) {
      console.warn("[tezcheck] natija noma'lum:", String(payment._id), d.problem.unknown_reason);
      return res.status(200).json({ success: true });
    }

    if (event.type === "payment.succeeded") {
      await settlePaid(payment, {
        amount_minor: d.amount_minor,
        environment: d.environment,
        tezcheck_payment_id: d.payment_id,
        provider_code: d.provider_code,
        fee_minor: d.fee_minor,
        net_minor: d.net_minor,
        succeeded_at: d.succeeded_at,
      });
    } else if (["payment.processing", "payment.requires_action"].includes(event.type)) {
      // Hodisalar tartibsiz kelishi mumkin: faqat pending bo'lsa o'tkazamiz
      await Payment.updateOne({ _id: payment._id, status: "pending" }, { $set: { status: "processing" } });
    } else if (["payment.refunded", "payment.partially_refunded", "payment.disputed", "payment.charged_back"].includes(event.type)) {
      // Balansni qaytarish avtomatik qilinmaydi: qo'lda ko'rib chiqing
      console.warn("[tezcheck] diqqat:", event.type, String(payment._id));
    }
    // failed / canceled / expired: hisob hali ochiq bo'lishi mumkin (mijoz boshqa usul bilan qayta urinadi).
    // Yakuniy holatni o'zimizning muddat (TTL) yoki foydalanuvchi bekor qilishi belgilaydi.

    return res.status(200).json({ success: true });
  } catch (err) {
    // 5xx qaytsak TezCheck 8 martagacha qayta yuboradi
    console.error("webhook:", err);
    return res.status(500).json({ success: false });
  }
};
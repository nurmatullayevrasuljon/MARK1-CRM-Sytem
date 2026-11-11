/**
 * MARK1 CRM — lokal QA / E2E server.
 *
 * Maqsad: production ma'lumotlariga tegmasdan, real backend + real Mongo
 * sxemasi ustida vizual va funksional testlarni bajarish.
 *
 * Ishga tushirish:  node qa/local-server.js
 * Port:             3001 (default, QA_PORT bilan o'zgartiriladi)
 *
 * Bu fayl faqat QA uchun. Production deploy'da ishlatilmaydi.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
// DIQQAT: sale.controller.js tranzaksiya (startSession/withTransaction)
// ishlatadi, ya'ni MongoDB replica set bo'lishi shart. Standalone
// MongoMemoryServer bilan sotuv yaratish "Transaction numbers are only
// allowed on a replica set member or mongos" xatosi bilan yiqiladi.
// Shuning uchun QA ham production kabi 1-node replica set ko'taradi.
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const PHONE = "901234567";
const PASSWORD = "mark1qa2026";

(async () => {
  const mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  process.env.MONGO_URI = mongod.getUri("mark1_qa");
  process.env.PORT = process.env.QA_PORT || "3001";
  process.env.ACCESS_SECRET = process.env.ACCESS_SECRET || "qa-access-secret-mark1";
  process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || "qa-refresh-secret-mark1";
  // QA'da 96 ta sahifa ochiladi (8 viewport × 2 tema × 6 bo'lim) — umumiy
  // rate-limit tugab, 429 lar console'ga tushib, haqiqiy xatolarni yashirardi.
  // Production defaultlari (300/10/20) o'zgarmaydi.
  process.env.API_RATE_LIMIT_MAX = "100000";
  process.env.AUTH_RATE_LIMIT_MAX = "1000";
  process.env.SMS_RATE_LIMIT_MAX = "1000";

  // ===== Obuna / to'lov QA: CORS (Frontend :8000, fake-pay :3002) =====
  process.env.ALLOWED_ORIGINS = [
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
  ].join(",");
  // TezCheck qaytish manzili — QA'da lokal Frontend sahifasi
  // QA'ga qaytish manzili 127.0.0.1 bo'lishi shart: agar localhost bo'lsa,
  // qaytish boshqa originga tushadi va localStorage (token, crm_api_root)
  // yo'qoladi — 401. Brauzer QA'da 127.0.0.1:8000 dan kiradi.
  process.env.TEZCHECK_RETURN_URL = "http://127.0.0.1:8000/payment.html";

  // ===== TezCheck MOCK (real API'siz to'lov sikli) =====
  // require.cache ga require.resolve dan oldin yoziladi, shuning uchun
  // server.js ichidagi payment.controller AYNAN shu mock'ni oladi.
  const FAKE_PAY_PORT = Number(process.env.QA_FAKEPAY_PORT || 3002);
  const bills = new Map(); // billId -> {id, reference, amount_minor, paid, external_reference, return_url}
  let billSeq = 0;

  class MockTezCheckError extends Error {
    constructor(message, opts = {}) {
      super(message);
      this.code = opts.code || "qa_mock_error";
      this.details = opts.details;
    }
  }

  const mockTezcheck = {
    TezCheckError: MockTezCheckError,
    async me() {
      return { service: { name: "QA TezCheck (mock)" } };
    },
    async createBill({ amountSom, externalReference, returnUrl }) {
      const id = `bill_qa_${++billSeq}`;
      const reference = `ref_${id}`;
      bills.set(id, {
        id,
        reference,
        amount_minor: amountSom * 100,
        paid: false,
        external_reference: externalReference || null,
        return_url: returnUrl || process.env.TEZCHECK_RETURN_URL || null,
      });
      const payment_url = `http://127.0.0.1:${FAKE_PAY_PORT}/pay?bill=${encodeURIComponent(id)}`;
      return { bill: { id, reference }, payment_url };
    },
    async getBill(billId) {
      const bill = bills.get(String(billId)) || { id: billId, paid: false, amount_minor: 0 };
      const pay = {
        id: `pay_${billId}`,
        state: bill.paid ? "succeeded" : "new",
        amount_minor: bill.amount_minor || 0,
        environment: "live", // settlePaid: live qabul qiladi
        provider_code: "qa_mock",
        fee_minor: 0,
        net_minor: bill.amount_minor || 0,
        succeeded_at: bill.paid ? new Date().toISOString() : null,
      };
      return { bill, payment: pay };
    },
    async cancelBill(billId) {
      const b = bills.get(String(billId));
      if (b) b.cancelled = true;
      return { bill: b || { id: billId, cancelled: true } };
    },
    verifyWebhook() {
      return false;
    },
  };

  const tezPath = require.resolve("../service/tezcheck.service");
  require.cache[tezPath] = {
    id: tezPath,
    filename: tezPath,
    loaded: true,
    exports: mockTezcheck,
  };

  // ===== DevSMS MOCK (real SMS'siz OTP) =====
  // signup/verify/forgot-password real DevSMS talab qilmasin: kod
  // console'ga chiqadi, javob {success:true} bo'ladi. Shu tufayli
  // "trial faqat bir marta" oqimini to'liq E2E sinash mumkin.
  const smsPath = require.resolve("../utils/sms.util");
  require.cache[smsPath] = {
    id: smsPath,
    filename: smsPath,
    loaded: true,
    exports: async (phone, message, type, templateType, serviceName, otpCode) => {
      console.log(`[qa] SMS MOCK -> ${phone}: OTP=${otpCode ?? "?"}`);
      return { success: true };
    },
  };

  // ===== Fake-pay sahifasi (TezCheck o'rniga, :3002) =====
  // /pay?bill=ID  — "To'lovni tasdiqlash" sahifasi
  // /confirm?bill=ID — hisobni paid qiladi va return_url ga qaytaradi
  const http = require("http");
  const payPage = (bill) => `<!doctype html>
<html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>To'lov — QA TezCheck</title>
<style>
 body{font-family:system-ui,sans-serif;background:#f4f6fb;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;color:#141a2e}
 .card{background:#fff;border-radius:16px;padding:32px;max-width:380px;width:92%;box-shadow:0 8px 30px rgba(20,26,46,.12);text-align:center}
 h1{font-size:18px;margin:0 0 6px} p{font-size:14px;color:#5b6478;margin:0 0 4px}
 .sum{font-size:26px;font-weight:800;margin:16px 0 4px}
 .badge{display:inline-block;font-size:11px;background:#fff3e0;color:#b45309;border-radius:999px;padding:4px 10px;margin-bottom:12px}
 a.btn{display:block;background:#4455ee;color:#fff;text-decoration:none;border-radius:12px;padding:14px;font-weight:700;margin-top:18px}
 a.cancel{display:block;color:#8b93a7;font-size:13px;margin-top:12px}
</style></head><body>
<div class="card">
  <span class="badge">QA MOCK — real pul yechilmaydi</span>
  <h1>TezCheck to'lovi</h1>
  <p>${(bill.title || "Balansni to'ldirish").replace(/</g, "&lt;")}</p>
  <div class="sum">${(bill.amount_minor / 100).toLocaleString("ru-RU")} so'm</div>
  <p>To'lovni tasdiqlang — balans bir zumda to'ldiriladi.</p>
  <a class="btn" href="/confirm?bill=${encodeURIComponent(bill.id)}">To'lovni tasdiqlash</a>
  <a class="cancel" href="javascript:history.back()">Bekor qilish</a>
</div>
</body></html>`;

  http
    .createServer((req, res) => {
      try {
        const u = new URL(req.url, `http://127.0.0.1:${FAKE_PAY_PORT}`);
        if (u.pathname === "/pay") {
          const bill = bills.get(u.searchParams.get("bill"));
          if (!bill) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Hisob topilmadi");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(payPage(bill));
          return;
        }
        if (u.pathname === "/confirm") {
          const bill = bills.get(u.searchParams.get("bill"));
          if (bill) bill.paid = true;
          const back = (bill && bill.return_url) || "http://127.0.0.1:8000/payment.html";
          const sep = back.includes("?") ? "&" : "?";
          const target =
            bill && bill.external_reference
              ? `${back}${sep}payment_id=${encodeURIComponent(bill.external_reference)}`
              : back;
          res.writeHead(302, { Location: target });
          res.end();
          return;
        }
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
      } catch (e) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(String(e && e.message));
      }
    })
    .listen(FAKE_PAY_PORT, "127.0.0.1", () => {
      console.log(`[qa] fake-pay (TezCheck mock): http://127.0.0.1:${FAKE_PAY_PORT}`);
    });

  const Store = require("../models/store.model");
  const User = require("../models/user.model");
  const Category = require("../models/category.model");
  const Product = require("../models/product.model");
  const Client = require("../models/client.model");
  const Sale = require("../models/sale.model");
  const Subscription = require("../models/subscription.model");

  // server.js o'zi ulanadi
  require("../server.js");
  await mongoose.connection.asPromise();

  await mongoose.connection.dropDatabase();

  const hash = await bcrypt.hash(PASSWORD, 10);
  const store = await Store.create({
    ceo_name: "QA Do'kon Egasi",
    ceo_phone: PHONE,
    store_name: "MARK1 QA Do'koni",
    password: hash,
    is_verified: true,
    otp: null,
    balance: 0,
  });

  const admin = await User.create({
    store_id: store._id,
    user_name: "QA Administrator",
    user_phone: "901234568",
    password: hash,
    role: "admin",
  });

  // Sotuvchi roli — ruxsat (RBAC) testlari uchun.
  const seller = await User.create({
    store_id: store._id,
    user_name: "QA Sotuvchi",
    user_phone: "901234569",
    password: hash,
    role: "seller",
  });

  // Ikkinchi do'kon — IDOR / tenant izolyatsiyasi testlari uchun.
  // Bu do'konning hech qanday ma'lumoti birinchi do'kondan ko'rinmasligi shart.
  const storeB = await Store.create({
    ceo_name: "QA Ikkinchi Do'kon",
    ceo_phone: "901234570",
    store_name: "MARK1 QA Ikkinchi Do'kon",
    password: hash,
    is_verified: true,
    otp: null,
    balance: 0,
  });

  // ===== Obuna seed =====
  // Ikki do'konga ham 14 kunlik trial — aks holda requirePlan (402) statistika
  // va yozish amallarini bloklab qo'yardi.
  const subSvc = require("../service/subscription.service");
  await subSvc.grantTrial(store._id);
  await subSvc.grantTrial(storeB._id);
  // To'lov yo'lini ikki xil sinash uchun:
  //  Store A — balans 250 000: START/STANDART to'g'ridan-to'g'ri balansdan sotib olinadi,
  //            GROWTH (349 000) yetmaydi -> to'ldirish (TezCheck) yo'li ochiladi.
  //  Store B — balans 0: har qanday tarif avval to'ldirishni talab qiladi.
  await Store.updateOne({ _id: store._id }, { $set: { balance: 250000 } });

  //  Store C — 14 kunlik bepul sinov TUGAGAN do'kon:
  //  `current == null`, `trial_used == true`. requirePlan 402
  //  (plan_required) va "trial tugagach tariflar ro'yxati chiqadi"
  //  oqimini (web + mobile) shu do'kon bilan test qilamiz.
  const storeC = await Store.create({
    ceo_name: "QA Tugagan Sinov",
    ceo_phone: "901234571",
    store_name: "MARK1 QA Tugagan Sinov",
    password: hash,
    is_verified: true,
    otp: null,
    balance: 0,
  });
  await subSvc.grantTrial(storeC._id);
  await Subscription.updateOne(
    { store: storeC._id, is_trial: true },
    {
      $set: {
        starts_at: new Date(Date.now() - 15 * 24 * 3600 * 1000),
        expires_at: new Date(Date.now() - 24 * 3600 * 1000),
      },
    },
  );
  await Store.updateOne(
    { _id: storeC._id },
    { $set: { plan_expires_at: new Date(Date.now() - 24 * 3600 * 1000) } },
  );

  const catB = await Category.create({
    store_id: storeB._id,
    category_name: "Boshqa do'kon kategoriyasi",
  });
  const productB = await Product.create({
    store_id: storeB._id,
    product_name: "BEGONA DO'KON MAHSULOTI",
    product_barcode: "9990001",
    category_id: catB._id,
    purchase_price: 1000,
    selling_price: 2000,
    quantity: 5,
    minimum_quantity: 1,
    unit: "dona",
  });
  const clientB = await Client.create({
    store_id: storeB._id,
    client_name: "BEGONA MIJOZ",
    client_phone: "909999999",
  });
  const saleB = await Sale.create({
    store_id: storeB._id,
    client_id: clientB._id,
    products: [
      {
        product_id: productB._id,
        purchase_price: 1000,
        selling_price: 2000,
        quantity: 1,
      },
    ],
    total_purchase: 1000,
    total_price: 2000,
    total_paid: 0,
    total_remaining: 2000,
    paid_by_cash: 0,
    paid_by_card: 0,
    payments: [],
    due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: "active",
  });

  const cats = await Category.insertMany([
    { store_id: store._id, category_name: "Ichimliklar" },
    { store_id: store._id, category_name: "Oziq-ovqat" },
    { store_id: store._id, category_name: "Maishiy kimyo" },
    { store_id: store._id, category_name: "Non mahsulotlari" },
  ]);

  const products = await Product.insertMany([
    { store_id: store._id, product_name: "Coca-Cola 1.5L", product_barcode: "4780001", category_id: cats[0]._id, purchase_price: 8000, selling_price: 12000, quantity: 120, minimum_quantity: 20, unit: "dona" },
    { store_id: store._id, product_name: "Suv Aysberg 1.5L", product_barcode: "4780002", category_id: cats[0]._id, purchase_price: 2500, selling_price: 4000, quantity: 8, minimum_quantity: 24, unit: "dona" },
    { store_id: store._id, product_name: "Pepsi 1L", product_barcode: "4780003", category_id: cats[0]._id, purchase_price: 7000, selling_price: 11000, quantity: 0, minimum_quantity: 12, unit: "dona" },
    { store_id: store._id, product_name: "Guruch Lazer 1kg", product_barcode: "4780004", category_id: cats[1]._id, purchase_price: 14000, selling_price: 19000, quantity: 64, minimum_quantity: 10, unit: "kg" },
    { store_id: store._id, product_name: "Makaron Oltin Don", product_barcode: "4780005", category_id: cats[1]._id, purchase_price: 6000, selling_price: 9000, quantity: 41, minimum_quantity: 15, unit: "dona" },
    { store_id: store._id, product_name: "Ariel 3kg", product_barcode: "4780006", category_id: cats[2]._id, purchase_price: 42000, selling_price: 56000, quantity: 17, minimum_quantity: 5, unit: "dona" },
    { store_id: store._id, product_name: "Non (bugungi)", product_barcode: "4780007", category_id: cats[3]._id, purchase_price: 2000, selling_price: 3000, quantity: 55, minimum_quantity: 10, unit: "dona" },
    { store_id: store._id, product_name: "Yog' Oltin 1L", product_barcode: "4780008", category_id: cats[1]._id, purchase_price: 17000, selling_price: 23000, quantity: 3, minimum_quantity: 8, unit: "dona" },
  ]);

  const clients = await Client.insertMany([
    { store_id: store._id, client_name: "Aziz Karimov", client_phone: "901112233" },
    { store_id: store._id, client_name: "Dilnoza Yusupova", client_phone: "902223344" },
    { store_id: store._id, client_name: "Sardor Toshmatov", client_phone: "903334455" },
    { store_id: store._id, client_name: "Malika Rasulova", client_phone: null },
  ]);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  let paySeq = 0;
  function mkSale({ daysAgo, items, paid, client, dueDays, status = "active" }) {
    const prods = items.map(([idx, qty]) => ({
      product_id: products[idx]._id,
      purchase_price: products[idx].purchase_price,
      selling_price: products[idx].selling_price,
      quantity: qty,
    }));
    const total_purchase = prods.reduce((s, p) => s + p.purchase_price * p.quantity, 0);
    const total_price = prods.reduce((s, p) => s + p.selling_price * p.quantity, 0);
    const total_paid = paid;
    const paidAt = new Date(now - daysAgo * day);
    return {
      store_id: store._id,
      client_id: client ? client._id : null,
      products: prods,
      total_purchase,
      total_price,
      total_paid,
      total_remaining: total_price - total_paid,
      paid_by_cash: total_paid,
      paid_by_card: 0,
      // payment_id noyob — aks holda sxemadagi unique index seed'ni to'xtatadi.
      payments: total_paid > 0
        ? [{ amount: total_paid, paid_at: paidAt, payment_method: "cash", payment_id: `qa-${++paySeq}` }]
        : [],
      due_date: dueDays != null ? new Date(now - daysAgo * day + dueDays * day) : null,
      status,
      createdAt: paidAt,
      updatedAt: paidAt,
    };
  }

  await Sale.insertMany([
    mkSale({ daysAgo: 0, items: [[0, 4], [6, 10]], paid: 78000, client: clients[0] }),
    mkSale({ daysAgo: 0, items: [[3, 2], [4, 3]], paid: 65000, client: null }),
    mkSale({ daysAgo: 1, items: [[5, 1], [0, 2]], paid: 80000, client: clients[1] }),
    mkSale({ daysAgo: 2, items: [[0, 6]], paid: 30000, client: clients[2], dueDays: -3 }),
    mkSale({ daysAgo: 4, items: [[3, 5], [7, 2]], paid: 50000, client: clients[1], dueDays: 3 }),
    mkSale({ daysAgo: 6, items: [[4, 4]], paid: 36000, client: clients[3] }),
    mkSale({ daysAgo: 8, items: [[0, 10], [6, 20]], paid: 180000, client: clients[0] }),
    mkSale({ daysAgo: 12, items: [[5, 2]], paid: 112000, client: null }),
    mkSale({ daysAgo: 15, items: [[3, 10]], paid: 120000, client: clients[2], dueDays: -10 }),
    mkSale({ daysAgo: 20, items: [[4, 8], [0, 5]], paid: 132000, client: clients[1] }),
    mkSale({ daysAgo: 25, items: [[6, 30]], paid: 90000, client: null }),
    mkSale({ daysAgo: 30, items: [[0, 12]], paid: 144000, client: clients[0] }),
    mkSale({ daysAgo: 35, items: [[3, 4]], paid: 76000, client: clients[3] }),
    mkSale({ daysAgo: 40, items: [[5, 3]], paid: 168000, client: clients[2] }),
  ]);

  console.log("\n=== MARK1 QA SERVER TAYYOR ===");
  console.log(`URL:      http://127.0.0.1:${process.env.PORT}`);
  console.log(`CEO:      ${PHONE} / ${PASSWORD}`);
  console.log(`Admin:    901234568 / ${PASSWORD}`);
  console.log(`Seller:   901234569 / ${PASSWORD}`);
  console.log(`Store B:  901234570 / ${PASSWORD}  (IDOR testi)`);
  console.log(`Store C:  901234571 / ${PASSWORD}  (trial TUGAGAN -> 402 plan_required)`);
  console.log(`Store:    ${store._id}`);
  console.log(`StoreB:   ${storeB._id}`);
  console.log(`StoreC:   ${storeC._id}`);
  console.log("============================\n");
})().catch((e) => {
  console.error("QA server xatosi:", e);
  process.exit(1);
});

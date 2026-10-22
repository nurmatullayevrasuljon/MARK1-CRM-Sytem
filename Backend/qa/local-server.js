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
  const Store = require("../models/store.model");
  const User = require("../models/user.model");
  const Category = require("../models/category.model");
  const Product = require("../models/product.model");
  const Client = require("../models/client.model");
  const Sale = require("../models/sale.model");

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
  console.log(`Telefon:  ${PHONE}`);
  console.log(`Parol:    ${PASSWORD}`);
  console.log(`Store:    ${store._id}`);
  console.log(`Admin:    ${admin._id}`);
  console.log("============================\n");
})().catch((e) => {
  console.error("QA server xatosi:", e);
  process.exit(1);
});

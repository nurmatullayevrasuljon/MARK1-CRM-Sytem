/**
 * MARK1 CRM — Sale.payments.payment_id indeksini xavfsiz almashtirish.
 *
 * Nima uchun kerak?
 *   Eski indeks: { store_id: 1, "payments.payment_id": 1 }
 *                { unique: true, sparse: true }
 *   `payments: []` bo'lgan hujjatda Mongo bu indeksga `null` yozadi va
 *   sparse uni chiqarmaydi. Natijada bir do'konda to'lovsiz ikkinchi sotuv
 *   `E11000 duplicate key` bilan yiqiladi.
 *
 *   Yangi indeks partialFilterExpression bilan faqat string payment_id'larni
 *   indekslaydi (models/sale.model.js).
 *
 * Mongoose mavjud indeksni avtomatik O'ZGARTIRMAYDI, shuning uchun ishga
 * tushirilgan bazada bir marta qo'lda bajarish kerak:
 *
 *   npm run migrate:payment-index
 *
 * Skript idempotent: agar eski indeks bo'lmasa, hech narsa qilmaydi.
 * Ma'lumotlarga tegmaydi — faqat indeksni qayta quradi.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Sale = require("../models/sale.model");

const OLD_INDEX = "store_id_1_payments.payment_id_1";

(async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI topilmadi (.env faylini tekshiring).");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB ulandi.");

  const indexes = await Sale.collection.indexes();
  const existing = indexes.find((i) => i.name === OLD_INDEX);

  if (!existing) {
    console.log(`"${OLD_INDEX}" indeksi topilmadi — yaratilmoqda...`);
  } else {
    const hasPartial = !!existing.partialFilterExpression;
    const hasSparse = !!existing.sparse;

    if (hasPartial) {
      console.log(`"${OLD_INDEX}" allaqachon partial indeks — o'zgartirish shart emas.`);
      await mongoose.disconnect();
      return;
    }

    console.log(
      `Eski indeks topildi (sparse=${hasSparse}). O'chirilmoqda...`,
    );
    await Sale.collection.dropIndex(OLD_INDEX);
    console.log("Eski indeks o'chirildi.");
  }

  // Schema'dagi yangi ta'rif bo'yicha indeksni yaratamiz.
  await Sale.syncIndexes();
  console.log("Yangi indeks yaratildi:");

  const after = await Sale.collection.indexes();
  after
    .filter((i) => i.key && i.key["payments.payment_id"] !== undefined)
    .forEach((i) => console.log("  ", JSON.stringify(i)));

  await mongoose.disconnect();
  console.log("Tayyor.");
})().catch(async (err) => {
  console.error("Migratsiya xatosi:", err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});

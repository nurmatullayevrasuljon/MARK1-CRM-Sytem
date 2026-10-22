/**
 * MARK1 CRM — Sale indekslari regressiya testlari.
 *
 * Bu testlar `store_id + payments.payment_id` unique indeksining
 * to'lovsiz sotuvlarda noto'g'ri ishlashini qamrab oladi.
 *
 * BUG (tuzatilgan): indeks `{ unique: true, sparse: true }` bilan
 * yaratilganda `payments: []` bo'lgan hujjat multikey indeksga
 * `payments.payment_id = null` sifatida tushardi. Sparse `null`ni
 * indeksdan chiqarmaydi, shuning uchun bir do'konda ikkinchi to'lovsiz
 * sotuv yaratish `E11000 duplicate key` bilan yiqilardi.
 *
 * Ishga tushirish: npm test
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Sale = require("../models/sale.model");

let mongod;

function saleDoc(store_id, extra = {}) {
  return {
    store_id,
    total_purchase: 60000,
    total_price: 100000,
    total_paid: 0,
    total_remaining: 100000,
    paid_by_cash: 0,
    paid_by_card: 0,
    status: "active",
    payments: [],
    ...extra,
  };
}

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: "mark1-index-test" });
  await Sale.init();
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test.beforeEach(async () => {
  await Sale.deleteMany({});
});

test("bir do'konda ikkinchi to'lovsiz sotuv yaratiladi (null payment_id bugi)", async () => {
  const store_id = new mongoose.Types.ObjectId();

  const first = await Sale.create(saleDoc(store_id));
  const second = await Sale.create(saleDoc(store_id));

  assert.ok(first._id);
  assert.ok(second._id);
  assert.equal(await Sale.countDocuments({ store_id }), 2);
});

test("opening_record uslubidagi ketma-ket qarzlar ham yaratiladi", async () => {
  const store_id = new mongoose.Types.ObjectId();

  await Sale.create(saleDoc(store_id, { total_price: 50000, total_remaining: 50000 }));
  await Sale.create(saleDoc(store_id, { total_price: 70000, total_remaining: 70000 }));

  assert.equal(await Sale.countDocuments({ store_id }), 2);
});

test("bir do'konda takroriy payment_id rad etiladi", async () => {
  const store_id = new mongoose.Types.ObjectId();
  const payment = {
    amount: 10000,
    paid_at: new Date(),
    payment_method: "cash",
    payment_id: "dup-key-1",
  };

  await Sale.create(saleDoc(store_id, { payments: [payment] }));

  await assert.rejects(
    Sale.create(saleDoc(store_id, { payments: [{ ...payment, paid_at: new Date() }] })),
    (err) => err && err.code === 11000,
  );
});

test("turli do'konlarda bir xil payment_id ruxsat etiladi", async () => {
  const a = new mongoose.Types.ObjectId();
  const b = new mongoose.Types.ObjectId();
  const payment = {
    amount: 10000,
    paid_at: new Date(),
    payment_method: "cash",
    payment_id: "shared-key",
  };

  await Sale.create(saleDoc(a, { payments: [payment] }));
  await Sale.create(saleDoc(b, { payments: [payment] }));

  assert.equal(await Sale.countDocuments({}), 2);
});

test("payment_id maydoni yo'q to'lov null indeks yaratmaydi", async () => {
  const store_id = new mongoose.Types.ObjectId();
  const payment = { amount: 10000, paid_at: new Date(), payment_method: "cash" };

  await Sale.create(saleDoc(store_id, { payments: [payment] }));
  await Sale.create(saleDoc(store_id, { payments: [{ ...payment }] }));

  assert.equal(await Sale.countDocuments({ store_id }), 2);
});

/**
 * MARK1 CRM — sale.addPayment integratsiya testlari.
 *
 * Ishga tushirish: npm test
 * Talab: mongodb-memory-server (dev dependency emas, package.json'da bor).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Sale = require("../models/sale.model");
const { addPayment } = require("../controllers/sale.controller");

let mongod;

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
}

async function createSale(overrides = {}) {
  return Sale.create({
    store_id: new mongoose.Types.ObjectId(),
    total_purchase: 60000,
    total_price: 100000,
    total_paid: 20000,
    total_remaining: 80000,
    paid_by_cash: 20000,
    paid_by_card: 0,
    status: "active",
    payments: [
      { amount: 20000, paid_at: new Date(), payment_method: "cash" },
    ],
    ...overrides,
  });
}

function callAddPayment(saleId, body, storeId) {
  const req = {
    query: { sale_id: String(saleId) },
    body,
    user: { store_id: storeId },
  };
  const res = mockRes();
  return addPayment(req, res).then(() => res);
}

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: "mark1-test" });
  await Sale.init();
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test.beforeEach(async () => {
  await Sale.deleteMany({});
});

test("naqd to'lov qoldiqni kamaytiradi va payments'ga yoziladi", async () => {
  const sale = await createSale();

  const res = await callAddPayment(
    sale._id,
    { amount: 30000, payment_method: "cash", payment_id: "p-cash-1" },
    sale.store_id,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.sale.total_remaining, 50000);
  assert.equal(res.body.sale.paid_by_cash, 50000);
  assert.equal(res.body.sale.paid_by_card, 0);
  assert.equal(res.body.sale.payments.length, 2);

  const saved = await Sale.findById(sale._id);
  assert.equal(saved.total_remaining, 50000);
  assert.equal(saved.payments.at(-1).payment_method, "cash");
  assert.equal(saved.payments.at(-1).payment_id, "p-cash-1");
});

test("karta to'lovi paid_by_card'ni oshiradi", async () => {
  const sale = await createSale();

  const res = await callAddPayment(
    sale._id,
    { amount: 25000, payment_method: "card" },
    sale.store_id,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.sale.paid_by_card, 25000);
  assert.equal(res.body.sale.paid_by_cash, 20000);
  assert.equal(res.body.sale.total_remaining, 55000);
});

test("qoldiqdan katta to'lov rad etiladi va baza o'zgarmaydi", async () => {
  const sale = await createSale();

  const res = await callAddPayment(
    sale._id,
    { amount: 90000, payment_method: "cash" },
    sale.store_id,
  );

  assert.equal(res.statusCode, 400);

  const saved = await Sale.findById(sale._id);
  assert.equal(saved.total_remaining, 80000);
  assert.equal(saved.payments.length, 1);
});

test("bir xil payment_id takroriy yozilmaydi (idempotent)", async () => {
  const sale = await createSale();
  const body = { amount: 10000, payment_method: "cash", payment_id: "same-key" };

  const first = await callAddPayment(sale._id, body, sale.store_id);
  const second = await callAddPayment(sale._id, body, sale.store_id);

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(second.body.idempotent, true);

  const saved = await Sale.findById(sale._id);
  assert.equal(saved.payments.length, 2);
  assert.equal(saved.total_remaining, 70000);
});

test("parallel to'lovlarda qoldiq manfiyga tushmaydi", async () => {
  const sale = await createSale();
  const body = (key) => ({
    amount: 60000,
    payment_method: "cash",
    payment_id: key,
  });

  const results = await Promise.all([
    callAddPayment(sale._id, body("parallel-1"), sale.store_id),
    callAddPayment(sale._id, body("parallel-2"), sale.store_id),
  ]);

  const codes = results.map((r) => r.statusCode).sort();
  assert.deepEqual(codes, [200, 400]);

  const saved = await Sale.findById(sale._id);
  assert.equal(saved.total_remaining, 20000);
  assert.ok(saved.total_remaining >= 0);
  assert.equal(saved.payments.length, 2);
});

test("noto'g'ri to'lov usuli rad etiladi", async () => {
  const sale = await createSale();

  const res = await callAddPayment(
    sale._id,
    { amount: 5000, payment_method: "crypto" },
    sale.store_id,
  );

  assert.equal(res.statusCode, 400);
});

test("bekor qilingan sotuvga to'lov qo'shilmaydi", async () => {
  const sale = await createSale({ status: "cancelled" });

  const res = await callAddPayment(
    sale._id,
    { amount: 5000, payment_method: "cash" },
    sale.store_id,
  );

  assert.equal(res.statusCode, 400);
});

test("boshqa do'kon sotuviga to'lov qo'shilmaydi", async () => {
  const sale = await createSale();

  const res = await callAddPayment(
    sale._id,
    { amount: 5000, payment_method: "cash" },
    new mongoose.Types.ObjectId(),
  );

  assert.equal(res.statusCode, 404);
});

test("noto'g'ri sale_id 400 qaytaradi (500 emas)", async () => {
  const res = await callAddPayment(
    "not-an-object-id",
    { amount: 5000, payment_method: "cash" },
    new mongoose.Types.ObjectId(),
  );

  assert.equal(res.statusCode, 400);
});

/**
 * MARK1 CRM — Backend xavfsizlik va ko'p ijarachilik (Multi-tenant) testlari.
 *
 * Ishga tushirish: npm test
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Category = require("../models/category.model");
const Product = require("../models/product.model");
const { updateCategory, deleteCategory } = require("../controllers/category.controller");
const { updateProduct, deleteProduct, addStock } = require("../controllers/product.controller");
const sanitizeMiddleware = require("../middlewares/sanitize.middleware");

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

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test("NoSQL sanitization: '$' va prototype kalitlarini xavfsiz tozalaydi", () => {
  const req = {
    body: {
      phone: { $ne: null },
      username: "admin",
      nested: { $gt: 5, valid: "ok" },
      __proto__: { polluted: true },
    },
    query: {
      category_id: { $regex: ".*" },
      safe_param: "test",
    },
    params: {},
  };

  let nextCalled = false;
  sanitizeMiddleware(req, {}, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.body.phone.$ne, undefined);
  assert.equal(req.body.username, "admin");
  assert.equal(req.body.nested.$gt, undefined);
  assert.equal(req.body.nested.valid, "ok");
  assert.equal(req.query.category_id.$regex, undefined);
  assert.equal(req.query.safe_param, "test");
});

test("IDOR himoyasi: Do'kon A boshqa Do'kon B ning kategoriyasini tahrirlay olmaydi", async () => {
  const storeA = new mongoose.Types.ObjectId();
  const storeB = new mongoose.Types.ObjectId();

  const catB = await Category.create({
    store_id: storeB,
    category_name: "Do'kon B Kategoriyasi",
  });

  const req = {
    user: { store_id: storeA.toString() },
    query: { category_id: catB._id.toString() },
    body: { category_name: "Xakerlik o'zgarishi" },
  };
  const res = mockRes();

  await updateCategory(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Kategoriya topilmadi");

  // Bazada o'zgarmaganligini tekshiramiz
  const freshCat = await Category.findById(catB._id);
  assert.equal(freshCat.category_name, "Do'kon B Kategoriyasi");
});

test("IDOR himoyasi: Do'kon A boshqa Do'kon B ning kategoriyasini o'chira olmaydi", async () => {
  const storeA = new mongoose.Types.ObjectId();
  const storeB = new mongoose.Types.ObjectId();

  const catB = await Category.create({
    store_id: storeB,
    category_name: "Do'kon B Kategoriyasi 2",
  });

  const req = {
    user: { store_id: storeA.toString() },
    query: { category_id: catB._id.toString() },
  };
  const res = mockRes();

  await deleteCategory(req, res);

  assert.equal(res.statusCode, 404);

  // Bazada o'chirilmaganligini tasdiqlaymiz
  const freshCat = await Category.findById(catB._id);
  assert.notEqual(freshCat, null);
});

test("Noto'g'ri ID validatsiyasi: Noto'g'ri category_id 400 qaytaradi (500 emas)", async () => {
  const storeA = new mongoose.Types.ObjectId();

  const req = {
    user: { store_id: storeA.toString() },
    query: { category_id: "noto'g'ri-id-123" },
    body: { category_name: "Test" },
  };
  const res = mockRes();

  await updateCategory(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Kategoriya ID noto'g'ri");
});

test("Noto'g'ri ID validatsiyasi: Noto'g'ri product_id 400 qaytaradi (500 emas)", async () => {
  const storeA = new mongoose.Types.ObjectId();

  const req = {
    user: { store_id: storeA.toString() },
    query: { product_id: "noto'g'ri-product-id" },
    body: { adding_quantity: 5 },
  };
  const res = mockRes();

  await addStock(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Tovar ID noto'g'ri");
});

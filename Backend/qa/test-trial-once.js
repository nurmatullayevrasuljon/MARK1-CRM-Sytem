/**
 * QA testi — bepul sinov (trial) qoidalari:
 *   1) Trial FAQAT BIR MARTA beriladi (trial_used atomik qulf).
 *   2) Trial muddati aniq 14 KUN.
 *   3) Ikkinchi grantTrial() -> null, qo'shimcha Subscription yaratilmaydi.
 *
 * Ishga tushirish:  node qa/test-trial-once.js
 * Production'da ishlatilmaydi (faqat alohida in-memory Mongo ko'taradi).
 */
const assert = require("assert");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const DAY_MS = 24 * 3600 * 1000;

(async () => {
  const mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(mongod.getUri("mark1_qa_trial_test"));

  const Store = require("../models/store.model");
  const Subscription = require("../models/subscription.model");
  const { TRIAL } = require("../config/plans");
  const { grantTrial, getCurrentSubscription } = require(
    "../service/subscription.service",
  );

  const hash = await bcrypt.hash("mark1qa2026", 10);
  const store = await Store.create({
    ceo_name: "Trial Test",
    ceo_phone: "900000001",
    store_name: "TRIAL TEST",
    password: hash,
    is_verified: true,
    otp: null,
    balance: 0,
  });

  // ── 1. Birinchi grantTrial → trial beriladi ──────────────────────
  const first = await grantTrial(store._id);
  assert(first, "birinchi grantTrial() trial berishi kerak");
  assert.strictEqual(first.is_trial, true, "is_trial === true bo'lishi kerak");
  assert.strictEqual(first.plan, "custom", "trial 'custom' tarifi sifatida");

  // ── 2. Muddat aniq 14 kun ────────────────────────────────────────
  const span = first.expires_at.getTime() - first.starts_at.getTime();
  assert.strictEqual(
    span,
    TRIAL.days * DAY_MS,
    `trial muddati ${TRIAL.days} kun bo'lishi kerak, lekin ${span / DAY_MS} kun`,
  );
  assert.strictEqual(TRIAL.days, 14, "TRIAL.days === 14");
  console.log(
    `✅ [1] Birinchi trial berildi: ${TRIAL.days} kun ` +
      `(${first.starts_at.toISOString()} → ${first.expires_at.toISOString()})`,
  );

  const refreshed = await Store.findById(store._id);
  assert.strictEqual(refreshed.trial_used, true, "trial_used === true bo'lishi kerak");

  // ── 3. Ikkinchi grantTrial → null, yangi obuna YARATILMAYDI ──────
  const before = await Subscription.countDocuments({ store: store._id });
  const second = await grantTrial(store._id);
  assert.strictEqual(second, null, "ikkinchi grantTrial() null qaytarishi kerak");
  const after = await Subscription.countDocuments({ store: store._id });
  assert.strictEqual(after, before, "ikkinchi urinishda yangi obuna yaratilmasligi kerak");
  console.log(`✅ [2] Ikkinchi grantTrial() → null (obunalar soni o'zgarmadi: ${after})`);

  // ── 4. Joriy obuna hali ham 14 kunlik (muddat buzilmagan) ────────
  const cur = await getCurrentSubscription(store._id);
  assert(cur, "joriy (trial) obuna faol bo'lishi kerak");
  assert.strictEqual(cur.is_trial, true);
  console.log(`✅ [3] Joriy obuna faol, is_trial=true, kunlar qoldi: ` +
    `${Math.ceil((cur.expires_at - Date.now()) / DAY_MS)}`);

  // ── 5. Muddat sun'iy ravishda o'tgan holda → current yo'q ────────
  await Subscription.updateOne(
    { _id: cur._id },
    { $set: { expires_at: new Date(Date.now() - 1000) } },
  );
  const expired = await getCurrentSubscription(store._id);
  assert.strictEqual(expired, null, "muddat o'tgach current === null bo'lishi kerak");
  console.log("✅ [4] Muddat o'tgach current → null (requirePlan 402 plan_required beradi)");

  console.log("\nPASS: trial qoidalari (1 marta + 14 kun + tugagach yo'q) tasdiqlandi");
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
})().catch((err) => {
  console.error("\nFAIL:", err.message);
  process.exit(1);
});

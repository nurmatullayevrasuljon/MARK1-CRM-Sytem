/**
 * Admin buyruqlari (loyiha ildizidan ishga tushiring):
 *
 *   node scripts/plan-admin.js custom <storeId> <kun> <max_users> <sms> <ai> [narx_som] [izoh]
 *   node scripts/plan-admin.js migrate
 *
 * custom  - do'konga individual tarif beradi (darhol boshlanadi, joriy obunani almashtiradi)
 * migrate - tarif tizimi qo'shilishidan OLDIN ro'yxatdan o'tgan, tasdiqlangan va obunasi yo'q
 *           do'konlarga 14 kunlik trial beradi. Avval biznes qarorini tasdiqlang:
 *           eski mijozlarga bepul davr berasizmi?
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Store = require("../models/store.model");
const Subscription = require("../models/subscription.model");
const { grantTrial, grantCustomPlan } = require("../service/subscription.service");

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  // O'zingizdagi ulanish o'zgaruvchisi nomi boshqacha bo'lsa, shu qatorni moslang
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  if (cmd === "custom") {
    const [storeId, days, maxUsers, sms, ai, price = "0", ...note] = args;
    if (!mongoose.isValidObjectId(storeId) || !(await Store.exists({ _id: storeId }))) {
      throw new Error("storeId noto'g'ri yoki do'kon topilmadi");
    }
    const sub = await grantCustomPlan(storeId, {
      days: Number(days),
      limits: { max_users: Number(maxUsers), sms: Number(sms), ai: Number(ai) },
      price_paid: Number(price),
      note: note.join(" ") || "admin tomonidan berilgan",
    });
    console.log("Custom tarif berildi:", String(sub._id), "->", sub.expires_at.toISOString());
  } else if (cmd === "migrate") {
    const stores = await Store.find({ is_verified: true, trial_used: { $ne: true } }).select("_id");
    let granted = 0;
    for (const s of stores) {
      if (await Subscription.exists({ store: s._id })) continue;
      if (await grantTrial(s._id)) granted += 1;
    }
    console.log(`Trial berildi: ${granted} ta do'konga (tekshirilgan: ${stores.length})`);
  } else {
    console.log("Noma'lum buyruq. Fayl boshidagi yo'riqnomaga qarang.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
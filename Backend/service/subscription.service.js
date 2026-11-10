const Store = require("../models/store.model");
const Subscription = require("../models/subscription.model");
const { PLANS, TRIAL } = require("../config/plans");

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCK_MS = 15 * 1000; // xarid paytidagi qulfning maksimal umri (server yiqilsa ham o'zi ochiladi)
const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);
const KIND_LABEL = { sms: "SMS", ai: "AI analitika" };

class PlanError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.name = "PlanError";
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

/* ------------------------------------------------------------------ */
/*  Joriy / navbatdagi obuna                                          */
/* ------------------------------------------------------------------ */

// Joriy obuna sanadan aniqlanadi (cron kerak emas): muddati o'tsa, o'zi "yo'q" bo'lib qoladi
async function getCurrentSubscription(storeId) {
  const now = new Date();
  return Subscription.findOne({
    store: storeId,
    status: "active",
    starts_at: { $lte: now },
    expires_at: { $gt: now },
  }).sort({ starts_at: -1 });
}

async function getScheduledSubscription(storeId) {
  return Subscription.findOne({
    store: storeId,
    status: "active",
    starts_at: { $gt: new Date() },
  }).sort({ starts_at: 1 });
}

// Store.plan va Store.plan_expires_at faqat ko'rsatish uchun nusxa; asl manba Subscription
async function syncStoreSummary(storeId) {
  const current = await getCurrentSubscription(storeId);
  const last = await Subscription.findOne({ store: storeId, status: "active" }).sort({
    expires_at: -1,
  });

  const update = { $set: { plan_expires_at: last ? last.expires_at : null } };
  if (current) update.$set.plan = current.plan;
  else update.$unset = { plan: 1 }; // enum null'ni qabul qilmaydi, shuning uchun o'chiramiz

  await Store.updateOne({ _id: storeId }, update);
}

function toPublicSub(s) {
  if (!s) return null;
  return {
    id: s._id,
    plan: s.plan,
    is_trial: s.is_trial,
    price_paid: s.price_paid,
    starts_at: s.starts_at,
    expires_at: s.expires_at,
    days_left: Math.max(0, Math.ceil((s.expires_at.getTime() - Date.now()) / DAY_MS)),
    limits: s.limits,
    usage: { sms: s.usage.sms, ai: s.usage.ai },
    remaining: {
      sms: Math.max(0, s.limits.sms - s.usage.sms),
      ai: Math.max(0, s.limits.ai - s.usage.ai),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Bepul sinov (trial) va admin beradigan custom tarif               */
/* ------------------------------------------------------------------ */

/**
 * Tasdiqlangan do'konga 14 kunlik bepul davr. Faqat BIR MARTA beriladi:
 * trial_used bayrog'i atomik o'rnatiladi, shuning uchun verify ikki marta chaqirilsa ham,
 * qayta ro'yxatdan o'tilsa ham ikkinchi trial berilmaydi.
 */
async function grantTrial(storeId) {
  const store = await Store.findOneAndUpdate(
    { _id: storeId, trial_used: { $ne: true } },
    { $set: { trial_used: true } },
    { new: true },
  );
  if (!store) return null; // trial allaqachon berilgan

  try {
    const now = new Date();
    const sub = await Subscription.create({
      store: storeId,
      plan: TRIAL.plan,
      is_trial: true,
      price_paid: 0,
      limits: { ...TRIAL.limits },
      starts_at: now,
      expires_at: addDays(now, TRIAL.days),
      note: "14 kunlik bepul sinov",
    });
    await syncStoreSummary(storeId);
    return sub;
  } catch (err) {
    await Store.updateOne({ _id: storeId }, { $set: { trial_used: false } }); // qayta urinib ko'rish uchun
    throw err;
  }
}

/**
 * Admin uchun: individual (custom) tarif. Darhol boshlanadi va joriy obunani almashtiradi.
 * limits: { max_users, sms, ai }, days: davomiyligi, price_paid: kelishilgan narx (so'm)
 */
async function grantCustomPlan(storeId, { days, limits, price_paid = 0, note = null }) {
  const nums = [days, limits && limits.max_users, limits && limits.sms, limits && limits.ai];
  if (nums.some((n) => !Number.isInteger(n) || n < 0) || days < 1) {
    throw new PlanError(400, "invalid_custom_plan", "days va limitlar butun, manfiy bo'lmagan son bo'lishi kerak");
  }

  const now = new Date();
  const sub = await Subscription.create({
    store: storeId,
    plan: "custom",
    is_trial: false,
    price_paid,
    limits: { max_users: limits.max_users, sms: limits.sms, ai: limits.ai },
    starts_at: now,
    expires_at: addDays(now, days),
    note,
  });

  await Subscription.updateMany(
    {
      store: storeId,
      status: "active",
      _id: { $ne: sub._id },
      starts_at: { $lte: now },
      expires_at: { $gt: now },
    },
    { $set: { status: "replaced", expires_at: now } },
  );
  await syncStoreSummary(storeId);
  return sub;
}

/* ------------------------------------------------------------------ */
/*  Tarif sotib olish (balansdan ayiriladi)                           */
/* ------------------------------------------------------------------ */

async function purchasePlan(storeId, planCode) {
  const plan = PLANS[planCode];
  if (!plan) throw new PlanError(400, "invalid_plan", "Noto'g'ri tarif");

  // Do'kon bo'yicha qulf: ikki marta bosish yoki parallel so'rovlar ikki marta pul yechmasligi uchun.
  // Mongo'ning atomik findOneAndUpdate'i mutex vazifasini bajaradi.
  const now = new Date();
  const locked = await Store.findOneAndUpdate(
    { _id: storeId, $or: [{ plan_lock_until: null }, { plan_lock_until: { $lt: now } }] },
    { $set: { plan_lock_until: new Date(now.getTime() + LOCK_MS) } },
    { new: true },
  );
  if (!locked) {
    throw new PlanError(409, "purchase_in_progress", "Oldingi so'rov hali bajarilmoqda, bir ozdan keyin urinib ko'ring");
  }

  try {
    if (await getScheduledSubscription(storeId)) {
      throw new PlanError(409, "already_scheduled", "Keyingi davr uchun tarif allaqachon sotib olingan");
    }

    const current = await getCurrentSubscription(storeId);
    // Pullik obuna bor bo'lsa, yangisi eskisi tugagan joydan boshlanadi (kunlar yo'qolmaydi).
    // Trial yoki obuna yo'q bo'lsa, darhol boshlanadi.
    const startsAt = current && !current.is_trial ? current.expires_at : now;

    // Atomik yechish: shart update ichida, shuning uchun parallel so'rovlar balansni manfiyga tushira olmaydi
    const debited = await Store.findOneAndUpdate(
      { _id: storeId, balance: { $gte: plan.price } },
      { $inc: { balance: -plan.price } },
      { new: true },
    );
    if (!debited) {
      const s = await Store.findById(storeId).select("balance");
      const balance = s ? s.balance : 0;
      throw new PlanError(402, "insufficient_balance", "Balans yetarli emas", {
        required: plan.price,
        balance,
        shortfall: plan.price - balance,
      });
    }

    let sub;
    try {
      sub = await Subscription.create({
        store: storeId,
        plan: plan.code,
        is_trial: false,
        price_paid: plan.price,
        limits: { ...plan.limits },
        starts_at: startsAt,
        expires_at: addDays(startsAt, plan.period_days),
      });
    } catch (err) {
      // Obuna yaratilmadi: pulni qaytaramiz
      try {
        await Store.updateOne({ _id: storeId }, { $inc: { balance: plan.price } });
      } catch (refundErr) {
        console.error("[plan] DIQQAT: pul qaytarilmadi, qo'lda tuzating:", String(storeId), plan.price, refundErr.message);
      }
      throw err;
    }

    // Trial pullik tarifga almashadi (qolgan trial kunlari yo'qoladi)
    if (current && current.is_trial) {
      await Subscription.updateOne(
        { _id: current._id, status: "active" },
        { $set: { status: "replaced", expires_at: now } },
      ).catch((e) => console.error("[plan] trial yopilmadi:", e.message));
    }

    await syncStoreSummary(storeId).catch((e) => console.error("[plan] summary sync:", e.message));
    return { subscription: sub, balance: debited.balance, queued: startsAt > now };
  } finally {
    await Store.updateOne({ _id: storeId }, { $set: { plan_lock_until: null } }).catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/*  SMS / AI limiti (atomik)                                          */
/* ------------------------------------------------------------------ */

/**
 * kind: "sms" | "ai". Limit tugamagan bo'lsa, hisoblagichni 1 ga oshiradi.
 * Shart update ichida (usage < limit), shuning uchun parallel so'rovlar limitdan oshirib yubora olmaydi.
 * Amal muvaffaqiyatsiz tugasa refundQuota(sub_id, kind) bilan qaytaring.
 */
async function consumeQuota(storeId, kind) {
  const now = new Date();
  const sub = await getCurrentSubscription(storeId);
  if (!sub) {
    return {
      ok: false,
      status: 402,
      code: "plan_required",
      message: "Tarif muddati tugagan. Davom etish uchun tarif sotib oling",
    };
  }

  const updated = await Subscription.findOneAndUpdate(
    {
      _id: sub._id,
      starts_at: { $lte: now },
      expires_at: { $gt: now },
      $expr: { $lt: [`$usage.${kind}`, `$limits.${kind}`] },
    },
    { $inc: { [`usage.${kind}`]: 1 } },
    { new: true },
  );

  if (!updated) {
    return {
      ok: false,
      status: 403,
      code: "quota_exceeded",
      message: `${KIND_LABEL[kind]} limiti tugagan (${sub.usage[kind]}/${sub.limits[kind]}). Tarifingizni yangilang`,
      limit: sub.limits[kind],
      used: sub.usage[kind],
    };
  }

  return { ok: true, sub_id: updated._id, kind, limit: updated.limits[kind], used: updated.usage[kind] };
}

async function refundQuota(subId, kind) {
  await Subscription.updateOne(
    { _id: subId, [`usage.${kind}`]: { $gt: 0 } },
    { $inc: { [`usage.${kind}`]: -1 } },
  );
}

module.exports = {
  PlanError,
  getCurrentSubscription,
  getScheduledSubscription,
  syncStoreSummary,
  toPublicSub,
  grantTrial,
  grantCustomPlan,
  purchasePlan,
  consumeQuota,
  refundQuota,
};
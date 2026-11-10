const Store = require("../models/store.model");
const { PLANS } = require("../config/plans");
const svc = require("../service/subscription.service");

// GET /api/subscription/plans
exports.listPlans = (req, res) => {
  return res.json({ success: true, plans: Object.values(PLANS) });
};

// GET /api/subscription/current
exports.getCurrent = async (req, res) => {
  try {
    const storeId = req.user.store_id;
    const [current, scheduled, store] = await Promise.all([
      svc.getCurrentSubscription(storeId),
      svc.getScheduledSubscription(storeId),
      Store.findById(storeId).select("balance"),
    ]);

    // Store.plan / plan_expires_at nusxasini ham to'g'rilab qo'yamiz (muddat tugagan bo'lishi mumkin)
    svc.syncStoreSummary(storeId).catch(() => {});

    return res.json({
      success: true,
      current: svc.toPublicSub(current), // null bo'lsa, tarif yo'q yoki muddati tugagan
      scheduled: svc.toPublicSub(scheduled), // sotib olingan, hali boshlanmagan davr
      balance: store ? store.balance : 0,
    });
  } catch (err) {
    console.error("getCurrent:", err);
    return res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

// POST /api/subscription/purchase   { plan: "start" | "standart" | "growth" | "pro" }
exports.purchase = async (req, res) => {
  try {
    const { plan } = req.body;
    const result = await svc.purchasePlan(req.user.store_id, plan);

    return res.status(201).json({
      success: true,
      message: result.queued
        ? "Tarif sotib olindi, joriy davr tugagach boshlanadi"
        : "Tarif sotib olindi va faollashtirildi",
      subscription: svc.toPublicSub(result.subscription),
      balance: result.balance,
    });
  } catch (err) {
    if (err instanceof svc.PlanError) {
      return res
        .status(err.status)
        .json({ success: false, code: err.code, message: err.message, ...err.extra });
    }
    console.error("purchase:", err);
    return res.status(500).json({ success: false, message: "Server xatosi" });
  }
};
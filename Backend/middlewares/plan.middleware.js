const { getCurrentSubscription } = require("../service/subscription.service");

/**
 * Faol tarifi bo'lmagan do'konni 402 bilan to'xtatadi.
 * Tekshiruv har so'rovda sanadan qilinadi (cron kerak emas): muddati tugagan zahoti to'xtaydi.
 *
 * requirePlan()                    - hamma so'rov bloklanadi
 * requirePlan({ allowRead: true }) - GET/HEAD/OPTIONS o'tadi, yozish (POST/PUT/PATCH/DELETE) bloklanadi
 */
exports.requirePlan =
  ({ allowRead = false } = {}) =>
  async (req, res, next) => {
    try {
      if (allowRead && ["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

      const sub = await getCurrentSubscription(req.user.store_id);
      if (!sub) {
        return res.status(402).json({
          success: false,
          code: "plan_required",
          message: "Tarif muddati tugagan. Davom etish uchun tarif sotib oling",
        });
      }

      req.subscription = sub;
      return next();
    } catch (err) {
      console.error("requirePlan:", err);
      return res.status(500).json({ success: false, message: "Server xatosi" });
    }
  };
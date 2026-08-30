const cron = require("node-cron");
const { DateTime } = require("luxon");
const sendSms = require("../utils/sms.util");
const Sale = require("../models/sale.model");

async function sendReminders() {
  const tomorrow = DateTime.now().setZone("Asia/Tashkent").plus({ days: 1 });

  const startOfTomorrow = tomorrow.startOf("day").toJSDate();
  const endOfTomorrow = tomorrow.endOf("day").toJSDate();

  const debts = await Sale.aggregate([
    {
      $match: {
        due_date: { $gte: startOfTomorrow, $lte: endOfTomorrow },
        total_remaining: { $gt: 0 },
        sms_sent: false,
        status: "active",
      },
    },
    {
      $lookup: {
        from: "clients",
        localField: "client_id",
        foreignField: "_id",
        as: "client",
      },
    },
    { $unwind: "$client" },
    {
      $match: {
        "client.client_phone": { $ne: null },
      },
    },
    {
      $lookup: {
        from: "stores",
        localField: "store_id",
        foreignField: "_id",
        as: "store",
      },
    },
    { $unwind: "$store" },
  ]);

  console.log(`[SMS reminder] ${debts.length} ta qarzga SMS yuboriladi`);

  for (const debt of debts) {
    const message = `MARK1: Hurmatli ${debt.client.client_name}, sizning ${debt.store.store_name} oldidagi ${debt.total_remaining} so'mlik qarzingizning to'lov muddati ertaga. Iltimos, to'lovni o'z vaqtida amalga oshiring. Murojaat uchun: ${debt.store.ceo_phone}`;

    const result = await sendSms(debt.client.client_phone, message);

    if (result.success) {
      await Sale.updateOne({ _id: debt._id }, { $set: { sms_sent: true } });
      console.log(`SMS yuborildi: ${debt.client.client_phone}`);
    } else {
      console.error(
        `SMS yuborilmadi (${debt.client.client_phone}):`,
        result.error,
      );
    }
  }
}

function startReminderCron() {
  cron.schedule(
    "0 7 * * *",
    () => {
      console.log(
        "[CRON] Due date reminder job boshlandi:",
        new Date().toISOString(),
      );
      sendReminders().catch((err) => console.error("[CRON] Xatolik:", err));
    },
    { timezone: "Asia/Tashkent" },
  );
}

module.exports = { startReminderCron, sendReminders };

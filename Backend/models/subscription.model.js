const mongoose = require("mongoose");

const LimitsSchema = new mongoose.Schema(
  {
    max_users: { type: Number, required: true, min: 0 },
    sms: { type: Number, required: true, min: 0 },
    ai: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

// Har bir obuna davri alohida hujjat: tarix saqlanadi, limit va ishlatilgan miqdor shu yerda.
// Yangi davr sotib olinsa yangi hujjat ochiladi, shuning uchun SMS/AI hisoblagichlari o'zi nolga tushadi.
const SubscriptionSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["start", "standart", "growth", "pro", "custom"],
      required: true,
    },
    is_trial: { type: Boolean, default: false },

    // Sotib olingan paytdagi narx (so'm). Tarif narxi keyin o'zgarsa ham, tarix buzilmaydi.
    price_paid: { type: Number, default: 0, min: 0 },

    // Tarif limitlari nusxasi (custom va trial uchun ham bir xil ishlashi uchun)
    limits: { type: LimitsSchema, required: true },

    usage: {
      sms: { type: Number, default: 0, min: 0 },
      ai: { type: Number, default: 0, min: 0 },
    },

    // starts_at kelajakda bo'lsa, bu navbatdagi (sotib olingan, hali boshlanmagan) davr
    starts_at: { type: Date, required: true },
    expires_at: { type: Date, required: true },

    // active   - amalda yoki navbatda
    // replaced - o'rniga boshqasi berilgan (masalan, trial pullik tarifga almashgan)
    status: { type: String, enum: ["active", "replaced"], default: "active" },

    note: { type: String, default: null },
  },
  { timestamps: true },
);

SubscriptionSchema.index({ store: 1, status: 1, starts_at: 1, expires_at: 1 });

module.exports = mongoose.model("Subscription", SubscriptionSchema);
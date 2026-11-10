const mongoose = require("mongoose");

const ACTIVE_STATUSES = ["created", "pending", "processing"];

const PaymentSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },

    // Do'kon balansiga qo'shiladigan summa, SO'MDA (TezCheck'ga tiyinda yuboriladi: amount * 100)
    amount: { type: Number, required: true, min: 1 },

    // created    - bazada yaratildi, TezCheck'da hisob hali ochilmadi
    // pending    - hisob ochildi, mijoz to'lashi kutilmoqda
    // processing - mijoz to'lov qilyapti (requires_action / processing)
    // paid       - pul tushdi va balansga qo'shildi
    // cancelled  - timeout yoki foydalanuvchi bekor qildi
    // failed     - hisob ochib bo'lmadi yoki test to'lov (balansga qo'shilmagan)
    status: {
      type: String,
      enum: ["created", "pending", "processing", "paid", "cancelled", "failed"],
      default: "created",
      index: true,
    },

    // Faqat ochiq to'lov uchun true. Do'konda bir vaqtda bitta ochiq to'lov bo'lishini
    // bazaning o'zi kafolatlaydi (pastdagi unikal partial index).
    is_active: { type: Boolean, default: true },

    // TezCheck hisobi (bill). payment_url faqat BIR MARTA qaytariladi, shuning uchun saqlab qo'yamiz.
    bill_id: { type: String, default: null },
    bill_reference: { type: String, default: null },
    payment_url: { type: String, default: null },

    // To'lov amalga oshgandan keyin to'ldiriladi
    tezcheck_payment_id: { type: String, default: null },
    provider_code: { type: String, default: null }, // click | payme | ...
    environment: { type: String, default: null }, // live | test
    fee_minor: { type: Number, default: null }, // komissiya (tiyin)
    net_minor: { type: Number, default: null }, // sizga tegishli qism (tiyin)

    expires_at: { type: Date, required: true },
    paid_at: { type: Date, default: null },
    cancel_reason: { type: String, default: null },
    fail_reason: { type: String, default: null },
    last_synced_at: { type: Date, default: null },

    // Webhook ham, so'rab olish ham bir vaqtda kelsa balans faqat bir marta oshishi uchun
    balance_credited: { type: Boolean, default: false },
    balance_after: { type: Number, default: null },

    // Debug va nizolar uchun: webhook va sync natijalari
    callbacks: [
      {
        type: { type: String },
        event_id: { type: String },
        payload: mongoose.Schema.Types.Mixed,
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: true },
);

// Bir do'konda bir vaqtda faqat bitta ochiq to'lov
PaymentSchema.index({ store: 1 }, { unique: true, partialFilterExpression: { is_active: true } });
// bill_id faqat string bo'lganda unikal (null'lar to'qnashmasligi uchun)
PaymentSchema.index(
  { bill_id: 1 },
  { unique: true, partialFilterExpression: { bill_id: { $type: "string" } } },
);
PaymentSchema.index({ store: 1, createdAt: -1 });

PaymentSchema.statics.ACTIVE_STATUSES = ACTIVE_STATUSES;

module.exports = mongoose.model("Payment", PaymentSchema);
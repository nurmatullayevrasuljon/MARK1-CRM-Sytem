const mongoose = require("mongoose");

const StoreSchema = new mongoose.Schema(
  {
    ceo_name: { type: String, required: [true, "Ismni kiriting"] },
    // ceo_email: {
    //   type: String,
    //   required: [true, "Emailni kiriting"],
    //   unique: true,
    //   trim: true,
    //   lowercase: true,
    //   match: [/^\S+@\S+\.\S+$/, "Email noto'g'ri formatda"],
    // },
    ceo_phone: {
      type: String,
      required: [true, "Telefon raqamni kiriting"],
      unique: true,
      match: [/^\d{9}$/, "Telefon raqam noto'g'ri formatda"],
    },
    store_name: { type: String, required: [true, "Do'kon nomini kiriting"] },
    password: { type: String, required: [true, "Parolni kiriting"] },
    balance: { type: Number, default: 0 },
    plan: { type: String, enum: ["free", "pro"], default: "free" },
    plan_expires_at: { type: Date, default: null },
    trial_used: { type: Boolean, default: false },     // trial faqat bir marta berilishi uchun
    plan_lock_until: { type: Date, default: null },    // xarid paytidagi qisqa qulf
    profile_picture: { type: String, default: null },
    otp: { type: String, default: null },
    otp_expires_at: { type: Date, default: null },
    otp_attempts: { type: Number, default: 0 },
    is_verified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Store", StoreSchema);

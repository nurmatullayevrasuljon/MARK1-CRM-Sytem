const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    store_id: {
      type: mongoose.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    user_name: { type: String, required: [true, "Ismni kiriting"] },
    user_phone: {
      type: String,
      required: [true, "Telefon raqamni kiriting"],
      unique: true,
      match: [/^\d{9}$/, "Telefon raqam noto'g'ri formatda"],
    },
    password: { type: String, required: [true, "Parolni kiriting"] },
    role: {
      type: String,
      required: [true, "Rolni tanlang"],
      enum: ["admin", "seller"],
    },
    profile_picture: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);

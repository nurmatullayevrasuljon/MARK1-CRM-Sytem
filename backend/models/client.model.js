const mongoose = require("mongoose");

const ClientSchema = new mongoose.Schema(
  {
    store_id: {
      type: mongoose.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    client_name: {
      type: String,
      required: [true, "Xaridor ismini kiriting"],
    },
    client_phone: {
      type: String,
      default: null,
      match: [/^\d{9}$/, "Telefon raqam noto'g'ri formatda"],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Client", ClientSchema);

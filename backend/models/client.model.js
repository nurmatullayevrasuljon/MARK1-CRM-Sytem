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

ClientSchema.index({ store_id: 1, createdAt: -1 });
ClientSchema.index({ store_id: 1, client_phone: 1 });

module.exports = mongoose.model("Client", ClientSchema);

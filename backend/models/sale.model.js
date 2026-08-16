const mongoose = require("mongoose");

const SaleSchema = new mongoose.Schema(
  {
    store_id: {
      type: mongoose.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    client_id: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    products: {
      type: [
        {
          product_id: {
            type: mongoose.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          purchase_price: { type: Number, default: 0 },
          selling_price: { type: Number, default: 0 },
          quantity: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    note: { type: String, default: null },
    total_purchase: { type: Number, required: true },
    total_price: { type: Number, required: true },
    total_paid: { type: Number, default: 0 },
    total_remaining: { type: Number, required: true, default: 0 },
    due_date: {
      type: Date,
      default: null,
    },
    payments: {
      type: [
        {
          amount: {
            type: Number,
            required: true,
          },
          paid_at: {
            type: Date,
            required: true,
          },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "returned"],
      default: "active",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Sale", SaleSchema);

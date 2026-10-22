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
    paid_by_cash: { type: Number, default: 0 },
    paid_by_card: { type: Number, default: 0 },
    sms_sent: { type: Boolean, default: false },
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
          payment_method: {
            type: String,
            default: "cash",
            enum: ["cash", "card"],
          },
          // Idempotentlik kaliti: bir xil to'lov ikki marta yozilmasligi uchun.
          // Qiymat bo'lmasa indeksga tushmaydi (sparse).
          payment_id: {
            type: String,
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

// Sotuvlar ro'yxati va filtrlar uchun asosiy indekslar
SaleSchema.index({ store_id: 1, createdAt: -1 });
SaleSchema.index({ store_id: 1, status: 1, createdAt: -1 });
SaleSchema.index({ store_id: 1, client_id: 1 });
SaleSchema.index({ store_id: 1, due_date: 1 });

// Bir do'kon ichida payment_id takrorlanmasligi (idempotent to'lov)
SaleSchema.index(
  { store_id: 1, "payments.payment_id": 1 },
  { unique: true, sparse: true },
);

module.exports = mongoose.model("Sale", SaleSchema);

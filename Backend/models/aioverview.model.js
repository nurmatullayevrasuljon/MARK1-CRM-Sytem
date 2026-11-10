const mongoose = require("mongoose");

const AiOverviewSchema = new mongoose.Schema(
  {
    store_id: {
      type: mongoose.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    period: {
      type: String,
      required: true,
      enum: ["daily"],
    },
    date: {
      type: Date,
      required: true,
    },
    sales: {
      type: {
        revenue: { type: Number, required: true },
        yesterday_revenue: { type: Number, required: true },
        last_7_days_average: { type: Number, required: true },
        profit: { type: Number, required: true },
        transactions: { type: Number, required: true },
      },
      required: true,
    },
    debts: {
      type: {
        new_debt: { type: Number, required: true },
        collected: { type: Number, required: true },
        overdue: { type: Number, required: true },
        overdue_clients: { type: Number, required: true },
      },
      required: true,
    },
    inventory: {
      low_stock_count: { type: Number, required: true },
      inventory_value: { type: Number, required: true },
    },
    top_products: {
      type: [
        {
          product_id: {
            type: mongoose.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          quantity_sold: { type: Number, required: true },
          revenue: { type: Number, required: true },
        },
      ],
      required: true,
    },
    slow_products: {
      type: [
        {
          product_id: {
            type: mongoose.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          days_without_sale: { type: Number, required: true },
          stock: { type: Number, required: true },
          stock_value: { type: Number, required: true },
        },
      ],
      required: true,
    },
    ai_overview: {
      type: String,
      required: true,
    },
    recommendations: {
      type: [
        {
          priority: String,
          action_type: String,
          title: String,
          reason: String,
          action: String,
          expected_effect: String,
          ref_type: String,
          ref_id: String,
          message_draft: String,
          status: {
            type: String,
            enum: ["yangi", "bajarildi", "rad_etildi", "foydali", "foydasiz"],
            default: "yangi",
          },
        },
      ],
      default: [],
    },
    recommendations_status: {
      type: String,
      enum: ["ok", "failed"],
      default: "ok",
    },
  },
  { timestamps: true },
);

AiOverviewSchema.index({ store_id: 1, date: -1 });

module.exports = mongoose.model("AiOverview", AiOverviewSchema);

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
  },
  { timestamps: true },
);

module.exports = mongoose.model("AiOverview", AiOverviewSchema);

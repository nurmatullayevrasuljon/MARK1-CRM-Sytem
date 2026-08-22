const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    store_id: {
      type: mongoose.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    product_name: { type: String, required: [true, "Tovar nomini kiriting"] },
    product_barcode: {
      type: String,
      default: null,
    },
    category_id: {
      type: mongoose.Types.ObjectId,
      ref: "Category",
      required: [true, "Kategoriya ID sini kiriting"],
    },
    purchase_price: { type: Number, default: 0 },
    selling_price: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    minimum_quantity: { type: Number, default: 0 },
    images: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", ProductSchema);
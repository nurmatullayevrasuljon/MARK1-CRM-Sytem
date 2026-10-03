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
<<<<<<< HEAD
=======
    // BUG FIX: "unit" maydoni umuman mavjud emas edi — shuning uchun UI'da
    // "dona"/"kg" tanlansa ham backend uni saqlay olmasdi, har doim standart
    // "dona" bo'lib qolardi. Controller req.body'ni to'liq o'tkazgani uchun
    // (Product.create(req.body) / findOneAndUpdate(..., req.body)) faqat
    // shu maydonni schema'ga qo'shish kifoya — controllerga tegilmadi.
>>>>>>> 4d9fe8d9bfa7ef6f92f4e2c5a4ba664385ffe379
    unit: { type: String, enum: ["dona", "kg"], default: "dona" },
    images: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", ProductSchema);
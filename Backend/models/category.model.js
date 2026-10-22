const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    store_id: {
      type: mongoose.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    category_name: {
      type: String,
      required: [true, "Kategoriya nomini kiriting"],
    },
  },
  { timestamps: true },
);

CategorySchema.index({ store_id: 1, createdAt: -1 });

module.exports = mongoose.model("Category", CategorySchema);

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

module.exports = mongoose.model("Category", CategorySchema);

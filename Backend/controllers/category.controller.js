const mongoose = require("mongoose");
const Category = require("../models/category.model");

exports.createCategory = async (req, res) => {
  try {
    const { category_name } = req.body;
    if (!category_name || typeof category_name !== "string" || !category_name.trim()) {
      return res.status(400).json({ message: "Kategoriya nomini kiriting" });
    }

    const category = await Category.create({
      store_id: req.user.store_id,
      category_name: category_name.trim(),
    });
    return res
      .status(200)
      .json({ message: "Kategoriya muvaffaqiyatli yaratildi", category });
  } catch (err) {
    console.error("createCategory error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { category_id } = req.query;
    const { category_name } = req.body;

    if (!category_id || !mongoose.Types.ObjectId.isValid(category_id)) {
      return res.status(400).json({ message: "Kategoriya ID noto'g'ri" });
    }

    if (!category_name || typeof category_name !== "string" || !category_name.trim()) {
      return res.status(400).json({ message: "Kategoriya nomini kiriting" });
    }

    // Multi-tenant isolation: faqat joriy do'konning kategoriyasini tahrirlash mumkin
    const category = await Category.findOneAndUpdate(
      {
        _id: category_id,
        store_id: req.user.store_id,
      },
      {
        category_name: category_name.trim(),
      },
      { new: true },
    );

    if (!category) {
      return res.status(404).json({ message: "Kategoriya topilmadi" });
    }

    return res
      .status(200)
      .json({ message: "Kategoriya muvaffaqiyatli tahrirlandi", category });
  } catch (err) {
    console.error("updateCategory error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { category_id } = req.query;

    if (!category_id || !mongoose.Types.ObjectId.isValid(category_id)) {
      return res.status(400).json({ message: "Kategoriya ID noto'g'ri" });
    }

    // Multi-tenant isolation: faqat joriy do'konning kategoriyasini o'chirish mumkin
    const category = await Category.findOneAndDelete({
      _id: category_id,
      store_id: req.user.store_id,
    });

    if (!category) {
      return res.status(404).json({ message: "Kategoriya topilmadi" });
    }

    return res
      .status(200)
      .json({ message: "Kategoriya muvaffaqiyatli o'chirildi" });
  } catch (err) {
    console.error("deleteCategory error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.getCategory = async (req, res) => {
  try {
    // Lean read-only query for high performance
    const categories = await Category.find({
      store_id: req.user.store_id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(categories);
  } catch (err) {
    console.error("getCategory error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

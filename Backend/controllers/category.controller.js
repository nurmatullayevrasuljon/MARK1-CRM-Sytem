const mongoose = require("mongoose");
const Category = require("../models/category.model");
const Product = require("../models/product.model");

// QA-BUGFIX: bir xil nomli kategoriya ikki marta yaratilishi mumkin edi —
// natijada mahsulotlar ikki xil "Ichimliklar" orasida bo'linib ketardi.
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findDuplicateCategory(storeId, name, excludeId = null) {
  const filter = {
    store_id: storeId,
    category_name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return Category.findOne(filter);
}

exports.createCategory = async (req, res) => {
  try {
    const { category_name } = req.body;
    if (!category_name || typeof category_name !== "string" || !category_name.trim()) {
      return res.status(400).json({ message: "Kategoriya nomini kiriting" });
    }

    const trimmedName = category_name.trim();

    if (trimmedName.length > 60) {
      return res
        .status(400)
        .json({ message: "Kategoriya nomi 60 belgidan oshmasligi kerak" });
    }

    if (await findDuplicateCategory(req.user.store_id, trimmedName)) {
      return res
        .status(400)
        .json({ message: "Bu nomdagi kategoriya allaqachon mavjud" });
    }

    const category = await Category.create({
      store_id: req.user.store_id,
      category_name: trimmedName,
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

    const trimmedName = category_name.trim();

    if (trimmedName.length > 60) {
      return res
        .status(400)
        .json({ message: "Kategoriya nomi 60 belgidan oshmasligi kerak" });
    }

    if (
      await findDuplicateCategory(req.user.store_id, trimmedName, category_id)
    ) {
      return res
        .status(400)
        .json({ message: "Bu nomdagi kategoriya allaqachon mavjud" });
    }

    // Multi-tenant isolation: faqat joriy do'konning kategoriyasini tahrirlash mumkin
    const category = await Category.findOneAndUpdate(
      {
        _id: category_id,
        store_id: req.user.store_id,
      },
      {
        category_name: trimmedName,
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

    // QA-BUGFIX: mahsuloti bor kategoriya o'chirilsa, mahsulotlar
    // mavjud bo'lmagan category_id bilan "yetim" qolardi — ular
    // filtrda va POS'da ko'rinmay qolishi mumkin edi.
    const category = await Category.findOne({
      _id: category_id,
      store_id: req.user.store_id,
    });

    if (!category) {
      return res.status(404).json({ message: "Kategoriya topilmadi" });
    }

    const productsInCategory = await Product.countDocuments({
      store_id: req.user.store_id,
      category_id,
    });

    if (productsInCategory > 0) {
      return res.status(400).json({
        message: `Bu kategoriyada ${productsInCategory} ta mahsulot bor. Avval ularni boshqa kategoriyaga o'tkazing yoki o'chiring`,
      });
    }

    await Category.deleteOne({ _id: category_id, store_id: req.user.store_id });

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

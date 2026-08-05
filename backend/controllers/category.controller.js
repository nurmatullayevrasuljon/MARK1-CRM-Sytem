const { default: mongoose } = require("mongoose");
const Category = require("../models/category.model");

exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create({
      store_id: req.user.id,
      category_name: req.body.category_name,
    });
    return res
      .status(200)
      .json({ message: "Kategoriya muvaffaqiyatli yaratildi", category });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.query.category_id,
      {
        category_name: req.body.category_name,
      },
      { new: true },
    );
    if (!category) {
      return res.status(400).json({ message: "Kategoriya topilmadi" });
    }
    return res
      .status(200)
      .json({ message: "Kategoriya muvaffaqiyatli tahrirlandi", category });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.query.category_id);
    if (!category) {
      return res.status(400).json({ message: "Kategoriya topilmadi" });
    }
    return res
      .status(200)
      .json({ message: "Kategoriya muvaffaqiyatli o'chirildi" });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const categoires = await Category.find({
      store_id: new mongoose.Types.ObjectId(req.user.id),
    });

    return res.status(200).json(categoires);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

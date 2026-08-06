const { default: mongoose } = require("mongoose");
const Product = require("../models/product.model");

exports.createProduct = async (req, res) => {
  try {
    const { product_barcode } = req.body;
    const existingProduct = await Product.findOne({ product_barcode });

    if (existingProduct) {
      return res.status(400).json({
        message: `${product_barcode}: ushbu barkod bilan tovar mavjud`,
      });
    }

    req.body.store_id = req.user.store_id;

    const product = await Product.create(req.body);

    return res
      .status(200)
      .json({ message: "Tovar muvaffaqiyatli yaratildi", product });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { product_barcode } = req.body;
    const { product_id } = req.query;
    const existingProduct = await Product.findOne({
      product_barcode,
      _id: { $ne: product_id },
      store_id: req.user.store_id,
    });

    if (existingProduct) {
      return res.status(400).json({
        message: `${product_barcode}: ushbu barkod bilan tovar mavjud`,
      });
    }

    req.body.store_id = req.user.store_id;

    const product = await Product.findOneAndUpdate(
      {
        _id: product_id,
        store_id: req.user.store_id,
      },
      req.body,
      {
        new: true,
      },
    );

    if (!product) {
      return res.status(400).json({
        message: "Tovar topilmadi",
      });
    }

    return res
      .status(200)
      .json({ message: "Tovar muvaffaqiyatli tahrirlandi", product });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { product_id } = req.query;

    const product = await Product.findByIdAndDelete(product_id);

    if (!product) {
      return res.status(400).json({
        message: "Tovar topilmadi",
      });
    }

    return res.status(200).json({ message: "Tovar muvaffaqiyatli o'chirildi" });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const {
      product_name,
      product_barcode,
      category_id,
      sort_type,
      sort_order,
    } = req.query;
    // sort_type: purchase_price, selling_price, quantity, minimum_quantity
    // sort_order: ascending, descending

    const filter = {
      store_id: req.user.store_id,
    };

    if (product_name) {
      filter.product_name = { $regex: product_name, $options: "i" };
    }

    if (product_barcode) {
      filter.product_barcode = { $regex: product_barcode, $options: "i" };
    }

    if (category_id) {
      if (!mongoose.Types.ObjectId.isValid(category_id)) {
        return res.status(400).json({ message: "category_id noto'g'ri" });
      }
      filter.category_id = new mongoose.Types.ObjectId(category_id);
    }

    const allowedSortFields = [
      "purchase_price",
      "selling_price",
      "quantity",
      "minimum_quantity",
    ];

    let sort = { createdAt: -1 };

    if (sort_type) {
      if (!allowedSortFields.includes(sort_type)) {
        return res.status(400).json({
          message: `sort_type noto'g'ri. Ruxsat etilgan qiymatlar: ${allowedSortFields.join(", ")}`,
        });
      }
      const direction = sort_order === "descending" ? -1 : 1;
      sort = { [sort_type]: direction };
    }

    const products = await Product.find(filter)
      .populate("category_id", "category_name")
      .sort(sort);

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

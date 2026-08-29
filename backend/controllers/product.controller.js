const { default: mongoose } = require("mongoose");
const Product = require("../models/product.model");

exports.createProduct = async (req, res) => {
  try {
    let { product_barcode } = req.body;

    // Shtrix-kod frontend tomonidan yuborilmasa, avtomatik generatsiya qilamiz
    if (!product_barcode) {
      product_barcode = `AUTO-${Date.now()}-${Math.floor(
        Math.random() * 10000,
      )}`;
      req.body.product_barcode = product_barcode;
    } else {
      const existingProduct = await Product.findOne({
        product_barcode,
        store_id: req.user.store_id,
      });

      if (existingProduct) {
        return res.status(400).json({
          message: `${product_barcode}: ushbu barkod bilan tovar mavjud`,
        });
      }
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

    if (product_barcode) {
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
    } else {
      delete req.body.product_barcode;
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

exports.addStock = async (req, res) => {
  try {
    const { product_id } = req.query;
    const { adding_quantity } = req.body;
    if (adding_quantity <= 0) {
      return res.status(400).json({
        message: "Qo'shilayotgan miqdor 0 dan katta bo'lishi kerak",
      });
    }
    const product = await Product.findOneAndUpdate(
      { _id: product_id, store_id: req.user.store_id },
      { $inc: { quantity: adding_quantity } },
      { new: true },
    );
    if (!product) {
      return res.status(400).json({
        message: "Tovar topilmadi",
      });
    }

    return res
      .status(200)
      .json({ message: "Tovar miqdori muvaffaqiyatli oshirildi", product });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { product_id } = req.query;

    const product = await Product.findOneAndDelete({
      _id: product_id,
      store_id: req.user.store_id,
    });

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
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      store_id: req.user.store_id,
    };

    if (product_name) {
      filter.product_name = {
        $regex: product_name,
        $options: "i",
      };
    }

    if (product_barcode) {
      filter.product_barcode = {
        $regex: product_barcode,
        $options: "i",
      };
    }

    if (category_id) {
      if (!mongoose.Types.ObjectId.isValid(category_id)) {
        return res.status(400).json({
          message: "category_id noto'g'ri",
        });
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

      sort = {
        [sort_type]: direction,
      };
    }

    // Pagination
    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const skip = (currentPage - 1) * perPage;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category_id", "category_name")
        .sort(sort)
        .skip(skip)
        .limit(perPage),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    });
  } catch (err) {
    console.log(err.message);

    return res.status(500).json({
      message: err.message,
    });
  }
};
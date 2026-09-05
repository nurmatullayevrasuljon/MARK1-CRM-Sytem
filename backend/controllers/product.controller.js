const { default: mongoose } = require("mongoose");
const Product = require("../models/product.model");

exports.createProduct = async (req, res) => {
  try {
    let { product_barcode } = req.body;

    // BUG FIX: bir xil nomli mahsulot bir necha marta kiritilsa, har safar
    // ALOHIDA hujjat yaratilar edi — chunki shtrix-kod tekshiruvi faqat
    // foydalanuvchi o'zi shtrix-kod kiritganda ishlaydi, avtomatik
    // generatsiya qilinganda esa har safar BOSHQACHA (vaqt+tasodifiy son)
    // bo'lgani uchun hech qachon mos kelmasdi. Endi mahsulot qo'shishdan
    // oldin xuddi shu nom (katta-kichik harfga qaramay) + xuddi shu
    // kategoriya bo'yicha mavjud mahsulot borligini tekshiramiz — bo'lsa,
    // yangi hujjat yaratmasdan, MAVJUDINING miqdorini oshiramiz (qayta
    // kirim/restock), narxlarini esa yangi kiritilgan qiymatga yangilaymiz.
    if (req.body.product_name && req.body.category_id) {
      const duplicateProduct = await Product.findOne({
        store_id: req.user.store_id,
        category_id: req.body.category_id,
        product_name: {
          $regex: `^${req.body.product_name.trim()}$`,
          $options: "i",
        },
      });

      if (duplicateProduct) {
        const addedQuantity = Number(req.body.quantity) || 0;

        duplicateProduct.quantity =
          (Number(duplicateProduct.quantity) || 0) + addedQuantity;

        if (req.body.purchase_price !== undefined) {
          duplicateProduct.purchase_price = req.body.purchase_price;
        }
        if (req.body.selling_price !== undefined) {
          duplicateProduct.selling_price = req.body.selling_price;
        }
        if (req.body.minimum_quantity !== undefined) {
          duplicateProduct.minimum_quantity = req.body.minimum_quantity;
        }
        if (req.body.unit !== undefined) {
          duplicateProduct.unit = req.body.unit;
        }
        if (req.body.images && req.body.images.length) {
          duplicateProduct.images = req.body.images;
        }

        await duplicateProduct.save();

        return res.status(200).json({
          message: `"${duplicateProduct.product_name}" mahsuloti allaqachon mavjud edi — miqdori ${addedQuantity} ga oshirildi`,
          product: duplicateProduct,
        });
      }
    }

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
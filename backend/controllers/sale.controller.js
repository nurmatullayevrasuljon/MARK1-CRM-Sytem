const mongoose = require("mongoose");
const Sale = require("../models/sale.model");
const Product = require("../models/product.model");
const parseDate = require("../utils/date.util");

exports.createSale = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      products,
      client_id = null,
      note = null,
      due_date = null,
      paid_by_cash = 0,
      paid_by_card = 0,
    } = req.body;
    const { store_id } = req.user;

    if (paid_by_cash < 0 || paid_by_card < 0) {
      throw new Error("To'lov qiymatlari manfiy bo'lmasligi kerak");
    }

    let saleProducts = [];
    let total_price = 0;
    let total_purchase = 0;
    const total_paid = paid_by_card + paid_by_cash;

    for (const item of products) {
      const product = await Product.findOne({
        _id: item.product_id,
        store_id,
      }).session(session);

      if (!product) {
        throw new Error("Mahsulot topilmadi");
      }

      if (product.quantity < item.quantity) {
        throw new Error(
          `${product.product_name} mahsulotidan omborda yetarli miqdor mavjud emas`,
        );
      }

      product.quantity -= item.quantity;
      await product.save({ session });

      saleProducts.push({
        product_id: product._id,
        purchase_price: item.purchase_price,
        selling_price: item.selling_price,
        quantity: item.quantity,
      });

      total_price += item.selling_price * item.quantity;
      total_purchase += item.purchase_price * item.quantity;
    }

    const total_remaining = total_price - total_paid;

    const payments = [];

    if (paid_by_cash > 0) {
      payments.push({
        amount: paid_by_cash,
        payment_method: "cash",
        paid_at: new Date(),
      });
    }

    if (paid_by_card > 0) {
      payments.push({
        amount: paid_by_card,
        payment_method: "card",
        paid_at: new Date(),
      });
    }

    const sale = new Sale({
      store_id,
      client_id,
      products: saleProducts,
      note,
      total_purchase,
      total_price,
      total_paid,
      total_remaining,
      paid_by_cash,
      paid_by_card,
      due_date,
      payments,
    });

    await sale.save({ session });

    await session.commitTransaction();

    return res.status(201).json({
      message: "Sotuv yaratildi",
      sale,
    });
  } catch (err) {
    await session.abortTransaction();

    return res.status(400).json({
      message: err.message,
    });
  } finally {
    session.endSession();
  }
};

exports.cancelSale = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { sale_id } = req.query;
    const { store_id } = req.user;

    const sale = await Sale.findOne({
      _id: sale_id,
      store_id,
    }).session(session);

    if (!sale) {
      throw new Error("Sotuv topilmadi");
    }

    for (const item of sale.products) {
      await Product.updateOne(
        {
          _id: item.product_id,
          store_id,
        },
        {
          $inc: {
            quantity: item.quantity,
          },
        },
        { session },
      );
    }

    await Sale.updateOne(
      {
        _id: sale_id,
        store_id,
      },
      {
        $set: {
          status: "cancelled",
        },
      },
      { session },
    );

    await session.commitTransaction();

    return res.status(200).json({
      message: "Sotuv muvaffaqiyatli bekor qilindi",
    });
  } catch (err) {
    await session.abortTransaction();

    console.log(err.message);

    return res.status(500).json({
      message: err.message,
    });
  } finally {
    session.endSession();
  }
};

exports.returnSale = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { sale_id } = req.query;
    const { store_id } = req.user;

    const sale = await Sale.findOne({
      _id: sale_id,
      store_id,
    }).session(session);

    if (!sale) {
      throw new Error("Sotuv topilmadi");
    }

    for (const item of sale.products) {
      await Product.updateOne(
        {
          _id: item.product_id,
          store_id,
        },
        {
          $inc: {
            quantity: item.quantity,
          },
        },
        { session },
      );
    }

    await Sale.updateOne(
      {
        _id: sale_id,
        store_id,
      },
      {
        $set: {
          status: "returned",
        },
      },
      { session },
    );

    await session.commitTransaction();

    return res.status(200).json({
      message: "Sotuv muvaffaqiyatli qaytarildi",
    });
  } catch (err) {
    await session.abortTransaction();

    console.log(err.message);

    return res.status(500).json({
      message: err.message,
    });
  } finally {
    session.endSession();
  }
};

exports.addPayment = async (req, res) => {
  try {
    const { sale_id } = req.query;
    const { amount, payment_method } = req.body;
    const { store_id } = req.user;

    const sale = await Sale.findOne({
      _id: sale_id,
      store_id,
    });

    if (!sale) {
      return res.status(404).json({
        message: "Sotuv topilmadi",
      });
    }

    if (sale.status !== "active") {
      return res.status(400).json({
        message: "Faqat faol sotuvga to'lov qo'shish mumkin",
      });
    }

    if (amount > sale.total_remaining) {
      return res.status(400).json({
        message: "To'lov summasi qolgan qarzdan katta bo'lishi mumkin emas",
      });
    }

    sale.payments.push({
      amount,
      paid_at: new Date(),
    });

    if (payment_method === "cash") {
      sale.paid_by_cash += amount;
    } else if (payment_method === "card") {
      sale.paid_by_card += amount;
    } else {
      return res.status(400).json({
        message: "To'lov usuli xato",
      });
    }
    sale.total_remaining -= amount;
    sale.total_paid += amount;

    await sale.save();

    return res.status(200).json({
      message: "To'lov muvaffaqiyatli qo'shildi",
      sale,
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({
      message: err.message,
    });
  }
};

exports.getSales = async (req, res) => {
  try {
    const { store_id } = req.user;

    const {
      client_id,
      product_id,
      status = "active",
      start_date,
      end_date,
      sort_type,
      sort_order = "descending",
    } = req.query;

    const filter = {
      store_id,
      status,
    };

    if (client_id) {
      filter.client_id = client_id;
    }

    if (product_id) {
      filter["products.product_id"] = product_id;
    }

    // Date filter
    if (start_date || end_date) {
      const createdAt = {};

      if (start_date) {
        const startDate = parseDate(start_date, false);

        if (!startDate) {
          return res.status(400).json({
            message: "start_date DD-MM-YYYY formatida bo'lishi kerak",
          });
        }

        createdAt.$gte = startDate;
      }

      if (end_date) {
        const endDate = parseDate(end_date, true);

        if (!endDate) {
          return res.status(400).json({
            message: "end_date DD-MM-YYYY formatida bo'lishi kerak",
          });
        }

        createdAt.$lte = endDate;
      }

      filter.createdAt = createdAt;
    }

    const sort = {};

    const allowedSortTypes = [
      "total_purchase",
      "total_price",
      "total_paid",
      "total_remaining",
    ];

    if (sort_type && allowedSortTypes.includes(sort_type)) {
      sort[sort_type] = sort_order === "ascending" ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const sales = await Sale.find(filter)
      .populate("client_id")
      .populate("products.product_id")
      .sort(sort);

    return res.status(200).json(sales);
  } catch (err) {
    console.log(err.message);

    return res.status(500).json({
      message: err.message,
    });
  }
};

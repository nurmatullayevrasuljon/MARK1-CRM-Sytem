const mongoose = require("mongoose");
const Sale = require("../models/sale.model");
const Product = require("../models/product.model");

exports.createSale = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      products,
      total_paid = 0,
      client_id = null,
      note = null,
    } = req.body;
    const { store_id } = req.user;

    let saleProducts = [];
    let total_price = 0;
    let total_purchase = 0;

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

    const sale = new Sale({
      store_id,
      client_id,
      products: saleProducts,
      note,
      total_purchase,
      total_price,
      total_paid,
      total_remaining,
      payments:
        total_paid > 0
          ? [
              {
                amount: total_paid,
                paid_at: new Date(),
              },
            ]
          : [],
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
    const { amount } = req.body;
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

    sale.total_paid += amount;
    sale.total_remaining -= amount;

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

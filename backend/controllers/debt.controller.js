const mongoose = require("mongoose");
const Sale = require("../models/sale.model");
const Client = require("../models/client.model");
const parseDate = require("../utils/date.util");

exports.getDebts = async (req, res) => {
  try {
    const {
      client_id,
      start_date, // DD-MM-YYYY
      end_date, // DD-MM-YYYY
      sort_type, // total_price, total_paid, total_remaining
      sort_order = "descending", // descending, ascending
    } = req.query;

    const store_id = req.user.store_id;

    // =========================
    // Base filter
    // =========================

    const filter = {
      store_id,
      total_remaining: { $gt: 0 },
    };

    // =========================
    // Client filter
    // =========================

    if (client_id) {
      if (!mongoose.Types.ObjectId.isValid(client_id)) {
        return res.status(400).json({
          message: "client_id noto'g'ri",
        });
      }

      filter.client_id = client_id;
    }

    // =========================
    // Date filter
    // =========================

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

    // =========================
    // Sort
    // =========================

    const allowedSortTypes = ["total_price", "total_paid", "total_remaining"];

    if (sort_type && !allowedSortTypes.includes(sort_type)) {
      return res.status(400).json({
        message:
          "sort_type faqat total_price, total_paid yoki total_remaining bo'lishi mumkin",
      });
    }

    const sortField = sort_type || "createdAt";

    const sortDirection = sort_order === "ascending" ? 1 : -1;

    const sort = {
      [sortField]: sortDirection,
    };

    // =========================
    // Query
    // =========================

    const debts = await Sale.find(filter)
      .populate("client_id")
      .populate("products.product_id")
      .sort(sort);

    return res.status(200).json({
      message: "Qarzlar muvaffaqiyatli olindi",
      count: debts.length,
      debts,
    });
  } catch (err) {
    console.log(err.message);

    return res.status(500).json({
      message: err.message,
    });
  }
};

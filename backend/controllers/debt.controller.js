const mongoose = require("mongoose");
const Sale = require("../models/sale.model");
const Client = require("../models/client.model");
const parseDate = require("../utils/date.util");
const {
  getTashkentDateParts,
  tashkentMidnight,
} = require("../utils/time.util");

exports.getDebts = async (req, res) => {
  try {
    const {
      client_id,
      start_date, // DD-MM-YYYY
      end_date, // DD-MM-YYYY
      sort_type, // total_price, total_paid, total_remaining
      sort_order = "descending", // descending, ascending
    } = req.query;

    const { store_id } = req.user;

    // =========================
    // Helper
    // =========================

    const getTashkentDateOnly = (date) => {
      const { year, month, day } = getTashkentDateParts(new Date(date));
      return tashkentMidnight(year, month, day);
    };

    // =========================
    // Base filter
    // =========================

    const filter = {
      store_id,
      status: "active",
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
    // Today's date - Tashkent
    // =========================

    const todayStart = getTashkentDateOnly(new Date());

    // =========================
    // Get debts
    // =========================

    const debts = await Sale.find(filter)
      .populate("client_id")
      .populate("products.product_id")
      .sort(sort);

    // =========================
    // Add overdue_days_count
    // =========================

    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const debtsWithOverdueDays = debts.map((debt) => {
      let overdue_days_count = 0;

      if (debt.due_date) {
        const dueDate = getTashkentDateOnly(debt.due_date);

        // Bugungi sana due_date'dan katta bo'lsa,
        // nechta kun o'tganini hisoblaymiz
        if (todayStart > dueDate) {
          overdue_days_count = Math.floor(
            (todayStart.getTime() - dueDate.getTime()) / MS_PER_DAY,
          );
        }
      }

      return {
        ...debt.toObject(),
        overdue_days_count,
      };
    });

    // =========================
    // Statistics
    // =========================

    const statisticsResult = await Sale.aggregate([
      {
        $match: {
          store_id: new mongoose.Types.ObjectId(store_id),
          status: "active",
          total_remaining: { $gt: 0 },
        },
      },

      {
        $group: {
          _id: null,

          // Barcha qarzlar summasi
          total_debt_amount: {
            $sum: "$total_remaining",
          },

          // Qarzdor clientlar
          debtor_clients: {
            $addToSet: "$client_id",
          },

          // Muddati o'tgan qarzlar soni
          overdue_debts_count: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$due_date", null] },
                    { $lt: ["$due_date", todayStart] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,

          total_debt_amount: 1,

          total_debtors_count: {
            $size: {
              $filter: {
                input: "$debtor_clients",
                as: "client",
                cond: {
                  $ne: ["$$client", null],
                },
              },
            },
          },

          overdue_debts_count: 1,
        },
      },
    ]);

    const statistics = statisticsResult[0] || {
      total_debtors_count: 0,
      total_debt_amount: 0,
      overdue_debts_count: 0,
    };

    // =========================
    // Response
    // =========================

    return res.status(200).json({
      message: "Qarzlar muvaffaqiyatli olindi",

      count: debtsWithOverdueDays.length,

      statistics,

      debts: debtsWithOverdueDays,
    });
  } catch (err) {
    console.log(err.message);

    return res.status(500).json({
      message: err.message,
    });
  }
};

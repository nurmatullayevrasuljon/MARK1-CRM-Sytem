const Sale = require("../models/sale.model");
const Product = require("../models/product.model");
const { default: mongoose } = require("mongoose");
const {
  getTashkentDateParts,
  tashkentMidnight,
} = require("../utils/time.util");

exports.getStatistics = async (req, res) => {
  try {
    const store_id = req.user.store_id;

    // O'zbekiston vaqti (UTC+5) bo'yicha bugungi sanani aniqlash
    const now = new Date();

    const uzbekTime = new Date(
      now.toLocaleString("en-US", {
        timeZone: "Asia/Tashkent",
      }),
    );

    const year = uzbekTime.getFullYear();
    const month = uzbekTime.getMonth();
    const day = uzbekTime.getDate();

    // Bugun 00:00
    const todayStart = new Date(year, month, day);

    // Ertaga 00:00
    const tomorrowStart = new Date(year, month, day + 1);

    // Bu oy boshlanishi
    const currentMonthStart = new Date(year, month, 1);

    // Keyingi oy boshlanishi
    const nextMonthStart = new Date(year, month + 1, 1);

    // O'tgan oy boshlanishi
    const previousMonthStart = new Date(year, month - 1, 1);

    // O'tgan oy oxiri
    const previousMonthEnd = currentMonthStart;

    // =========================================
    // SALES STATISTICS
    // =========================================

    const salesStats = await Sale.aggregate([
      {
        $match: {
          store_id: new mongoose.Types.ObjectId(store_id),
          status: "active",
        },
      },
      {
        $facet: {
          // Bu oy
          currentMonth: [
            {
              $match: {
                createdAt: {
                  $gte: currentMonthStart,
                  $lt: nextMonthStart,
                },
              },
            },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$total_price" },
                profit: {
                  $sum: {
                    $subtract: ["$total_price", "$total_purchase"],
                  },
                },
              },
            },
          ],

          // O'tgan oy
          previousMonth: [
            {
              $match: {
                createdAt: {
                  $gte: previousMonthStart,
                  $lt: previousMonthEnd,
                },
              },
            },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$total_price" },
              },
            },
          ],

          // Bugungi sotuv
          today: [
            {
              $match: {
                createdAt: {
                  $gte: todayStart,
                  $lt: tomorrowStart,
                },
              },
            },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$total_price" },
              },
            },
          ],

          // Kechagi sotuv
          yesterday: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(year, month, day - 1),
                  $lt: todayStart,
                },
              },
            },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$total_price" },
              },
            },
          ],

          // Hozirgi qarzdorlik
          overdue: [
            {
              $match: {
                total_remaining: { $gt: 0 },
                due_date: { $ne: null },
              },
            },
            {
              $match: {
                $expr: {
                  $lt: [
                    {
                      $dateTrunc: {
                        date: "$due_date",
                        unit: "day",
                        timezone: "Asia/Tashkent",
                      },
                    },
                    todayStart,
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$total_remaining" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const stats = salesStats[0];

    const monthlyRevenue = stats.currentMonth[0]?.revenue || 0;

    const previousMonthlyRevenue = stats.previousMonth[0]?.revenue || 0;

    const dailySales = stats.today[0]?.revenue || 0;

    const yesterdaySales = stats.yesterday[0]?.revenue || 0;

    const monthlyProfit = stats.currentMonth[0]?.profit || 0;

    const overduePayments = stats.overdue[0]?.total || 0;

    const overdueCount = stats.overdue[0]?.count || 0;

    // =========================================
    // MONTHLY REVENUE GROWTH
    // =========================================

    let monthlyRevenueGrowth = 0;

    if (previousMonthlyRevenue > 0) {
      monthlyRevenueGrowth =
        ((monthlyRevenue - previousMonthlyRevenue) / previousMonthlyRevenue) *
        100;
    }

    // =========================================
    // DAILY SALES CHANGE
    // =========================================

    let dailySalesChange = 0;

    if (yesterdaySales > 0) {
      dailySalesChange = ((dailySales - yesterdaySales) / yesterdaySales) * 100;
    }

    // =========================================
    // INVENTORY BALANCE
    // =========================================

    const inventoryStats = await Product.aggregate([
      {
        $match: {
          store_id: new mongoose.Types.ObjectId(store_id),
        },
      },
      {
        $group: {
          _id: null,
          balance: {
            $sum: {
              $multiply: ["$purchase_price", "$quantity"],
            },
          },
        },
      },
    ]);

    const inventoryBalance = inventoryStats[0]?.balance || 0;

    // =========================================
    // LOW STOCK
    // =========================================

    const lowStockCount = await Product.countDocuments({
      store_id: new mongoose.Types.ObjectId(store_id),
      $expr: {
        $lte: ["$quantity", "$minimum_quantity"],
      },
    });

    // =========================================
    // RESPONSE
    // =========================================

    return res.status(200).json({
      monthly_revenue: monthlyRevenue,

      monthly_revenue_growth: Number(monthlyRevenueGrowth.toFixed(2)),

      daily_sales: dailySales,

      daily_sales_change: Number(dailySalesChange.toFixed(2)),

      monthly_profit: monthlyProfit,

      inventory_balance: inventoryBalance,

      overdue_payments: overduePayments,

      overdue_count: overdueCount,

      low_stock_count: lowStockCount,
    });
  } catch (err) {
    console.log(err.message);

    return res.status(500).json({
      message: err.message,
    });
  }
};

exports.getDailyRevenue = async (req, res) => {
  try {
    const store_id = req.user.store_id;

    const now = new Date();

    const { year, month, day } = getTashkentDateParts(now);

    const todayStart = tashkentMidnight(year, month, day);
    const tomorrowStart = tashkentMidnight(year, month, day + 1);

    const result = await Sale.aggregate([
      {
        $match: {
          store_id: new mongoose.Types.ObjectId(store_id),
          status: "active",
          createdAt: {
            $gte: todayStart,
            $lt: tomorrowStart,
          },
        },
      },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: "$total_price",
          },
        },
      },
    ]);

    const dailyRevenue = result[0]?.revenue || 0;

    return res.status(200).json({
      daily_revenue: dailyRevenue,
    });
  } catch (err) {
    console.log(err.message);

    return res.status(500).json({
      message: err.message,
    });
  }
};

exports.getWeeklyTrend = async (req, res) => {
  try {
    const store_id = req.user.store_id;

    const now = new Date();

    const { year, month, day } = getTashkentDateParts(now);

    const todayStart = tashkentMidnight(year, month, day);
    const tomorrowStart = tashkentMidnight(year, month, day + 1);

    // 0 = Sunday
    // 1 = Monday
    // ...
    // 6 = Saturday
    const dayOfWeek = new Date(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}T12:00:00+05:00`,
    ).getDay();

    // Monday = 0, Tuesday = 1, ..., Sunday = 6
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // Shu haftaning dushanbasi
    const weekStart = new Date(
      todayStart.getTime() - daysFromMonday * 24 * 60 * 60 * 1000,
    );

    // Haftaning oxirigacha
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const result = await Sale.aggregate([
      {
        $match: {
          store_id: new mongoose.Types.ObjectId(store_id),
          status: "active",
          createdAt: {
            $gte: weekStart,
            $lt: weekEnd,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "Asia/Tashkent",
            },
          },
          revenue: {
            $sum: "$total_price",
          },
        },
      },
    ]);

    const revenueByDate = {};

    for (const item of result) {
      revenueByDate[item._id] = item.revenue;
    }

    const dayNames = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    const weeklyTrend = {};

    // DOIM 7 kun
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);

      const dateParts = getTashkentDateParts(date);

      const dateKey =
        `${dateParts.year}-` +
        `${String(dateParts.month).padStart(2, "0")}-` +
        `${String(dateParts.day).padStart(2, "0")}`;

      weeklyTrend[dayNames[i]] = revenueByDate[dateKey] || 0;
    }

    return res.status(200).json(weeklyTrend);
  } catch (err) {
    console.log(err.message);

    return res.status(500).json({
      message: err.message,
    });
  }
};



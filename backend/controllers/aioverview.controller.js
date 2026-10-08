const Sale = require("../models/sale.model");
const Product = require("../models/product.model");
const AiOverview = require("../models/aioverview.model");
const Category = require("../models/category.model");

const mongoose = require("mongoose");

const SLOW_PRODUCT_THRESHOLD_DAYS = 15;
const SLOW_PRODUCT_LIMIT = 5; // bazaga saqlanadigan ro'yxat uzunligi
const TOP_PRODUCT_LIMIT = 5;
const GROWTH_DRIVER_SHARE = 0.4;

// Platforma vaqt zonasi: UTC+5 (O'zbekistonda yozgi vaqt yo'q).
// Kun chegaralari server zonasiga bog'liq bo'lmasligi uchun shu yerdan olinadi.
const TZ_OFFSET_HOURS = 5;
const TZ_OFFSET_MS = TZ_OFFSET_HOURS * 3600000;
const DAY_MS = 86400000;

const MONTHS_UZ = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

// ---------- Sana yordamchilari ----------

// Berilgan momentning platforma vaqtidagi kalendar qismlari
function localParts(d) {
  const s = new Date(d.getTime() + TZ_OFFSET_MS);
  return {
    year: s.getUTCFullYear(),
    month: s.getUTCMonth(), // 0-11
    day: s.getUTCDate(),
  };
}

// Platforma vaqtidagi kun boshi (UTC moment sifatida)
function startOfDay(d) {
  const { year, month, day } = localParts(d);
  return new Date(Date.UTC(year, month, day) - TZ_OFFSET_MS);
}
function endOfDay(d) {
  return new Date(startOfDay(d).getTime() + DAY_MS - 1);
}
function subDays(d, n) {
  return new Date(d.getTime() - n * DAY_MS);
}
function diffInDays(a, b) {
  return Math.max(0, Math.round((startOfDay(a) - startOfDay(b)) / DAY_MS));
}

// DD-MM-YYYY -> platforma vaqtidagi shu kunning boshi
function parseDDMMYYYY(str) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(str || "");
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const utc = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (Number.isNaN(utc.getTime())) return null;
  // 31-02-2026 kabi sanalar keyingi oyga "o'tib ketmasligi" uchun tekshiruv
  if (utc.getUTCMonth() !== mm - 1 || utc.getUTCDate() !== dd) return null;
  return new Date(utc.getTime() - TZ_OFFSET_MS);
}

// "2026-09-29" (platforma vaqtida)
function toYMD(d) {
  const { year, month, day } = localParts(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${year}-${p(month + 1)}-${p(day)}`;
}

// "29-sentabr"
function toDateLabel(d) {
  const { month, day } = localParts(d);
  return `${day}-${MONTHS_UZ[month]}`;
}

// ---------- Hisob yordamchilari ----------

function pct(a, b) {
  return b ? Math.round(((a - b) / b) * 100) : null;
}

// AI'ga yo'nalish va musbat foiz alohida beriladi
function buildChange(current, previous) {
  const p = pct(current, previous);
  if (p === null) return null; // oldingi kun 0 bo'lsa taqqoslab bo'lmaydi
  if (p === 0) return { direction: "o'zgarmadi", pct: 0 };
  return { direction: p > 0 ? "oshdi" : "kamaydi", pct: Math.abs(p) };
}

// 1_200_000 -> "1.2 mln so'm", 620_000 -> "620 ming so'm", 500 -> "500 so'm"
function formatMoney(n) {
  const v = Math.round(Number(n) || 0);
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 999500) {
    const mln = Math.round(abs / 100000) / 10;
    return `${sign}${mln} mln so'm`;
  }
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)} ming so'm`;
  return `${sign}${abs} so'm`;
}

// ---------- Sales ----------

async function getSalesStats(storeId, date) {
  const sumRevenue = async (start, end) => {
    const [row] = await Sale.aggregate([
      {
        $match: {
          store_id: storeId,
          status: "active",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total_price" },
          purchase: { $sum: "$total_purchase" },
          transactions: { $sum: 1 },
        },
      },
    ]);
    return row || { revenue: 0, purchase: 0, transactions: 0 };
  };

  const today = await sumRevenue(startOfDay(date), endOfDay(date));
  const yesterday = await sumRevenue(
    startOfDay(subDays(date, 1)),
    endOfDay(subDays(date, 1)),
  );

  const [week] = await Sale.aggregate([
    {
      $match: {
        store_id: storeId,
        status: "active",
        createdAt: {
          $gte: startOfDay(subDays(date, 7)),
          $lt: startOfDay(date),
        },
      },
    },
    { $group: { _id: null, revenue: { $sum: "$total_price" } } },
  ]);

  return {
    revenue: today.revenue,
    yesterday_revenue: yesterday.revenue,
    last_7_days_average: Math.round((week?.revenue || 0) / 7),
    profit: today.revenue - today.purchase,
    transactions: today.transactions,
  };
}

// ---------- Debts ----------

async function getDebtsStats(storeId, date) {
  const [newDebtRow] = await Sale.aggregate([
    {
      $match: {
        store_id: storeId,
        status: "active",
        createdAt: { $gte: startOfDay(date), $lte: endOfDay(date) },
        total_remaining: { $gt: 0 },
      },
    },
    { $group: { _id: null, sum: { $sum: "$total_remaining" } } },
  ]);

  const [collectedRow] = await Sale.aggregate([
    {
      $match: { store_id: storeId, status: "active", client_id: { $ne: null } },
    },
    { $unwind: "$payments" },
    {
      $match: {
        "payments.paid_at": { $gte: startOfDay(date), $lte: endOfDay(date) },
        $expr: {
          $gt: ["$payments.paid_at", { $add: ["$createdAt", 60000] }],
        },
      },
    },
    { $group: { _id: null, sum: { $sum: "$payments.amount" } } },
  ]);

  const overdueSales = await Sale.find({
    store_id: storeId,
    status: "active",
    total_remaining: { $gt: 0 },
    due_date: { $ne: null, $lt: startOfDay(date) },
  }).select("total_remaining client_id");

  const overdue = overdueSales.reduce((s, x) => s + x.total_remaining, 0);
  const overdue_clients = new Set(
    overdueSales.filter((s) => s.client_id).map((s) => String(s.client_id)),
  ).size;

  return {
    new_debt: newDebtRow?.sum || 0,
    collected: collectedRow?.sum || 0,
    overdue,
    overdue_clients,
  };
}

// ---------- Inventory ----------

async function getInventoryStats(storeId) {
  const low_stock_count = await Product.countDocuments({
    store_id: storeId,
    $expr: { $lte: ["$quantity", "$minimum_quantity"] },
  });

  const [valueRow] = await Product.aggregate([
    { $match: { store_id: storeId } },
    {
      $group: {
        _id: null,
        value: { $sum: { $multiply: ["$quantity", "$purchase_price"] } },
      },
    },
  ]);

  return { low_stock_count, inventory_value: valueRow?.value || 0 };
}

// ---------- Eng ko'p sotilgan mahsulotlar (tanlangan kun) ----------

async function getTopProducts(storeId, date, limit = TOP_PRODUCT_LIMIT) {
  return Sale.aggregate([
    {
      $match: {
        store_id: storeId,
        status: "active",
        createdAt: { $gte: startOfDay(date), $lte: endOfDay(date) },
      },
    },
    { $unwind: "$products" },
    {
      $group: {
        _id: "$products.product_id",
        quantity_sold: { $sum: "$products.quantity" },
        revenue: {
          $sum: {
            $multiply: ["$products.quantity", "$products.selling_price"],
          },
        },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    { $project: { _id: 0, product_id: "$_id", quantity_sold: 1, revenue: 1 } },
  ]);
}

// Tanlangan mahsulotning oxirgi 7 kunlik o'rtacha kunlik sotilishi
async function getAvgDailyQty(storeId, productId, date) {
  const [row] = await Sale.aggregate([
    {
      $match: {
        store_id: storeId,
        status: "active",
        createdAt: {
          $gte: startOfDay(subDays(date, 7)),
          $lt: startOfDay(date),
        },
      },
    },
    { $unwind: "$products" },
    { $match: { "products.product_id": productId } },
    { $group: { _id: null, qty: { $sum: "$products.quantity" } } },
  ]);
  return (row?.qty || 0) / 7;
}

// ---------- Uzoq vaqt sotilmagan mahsulotlar ----------
// Barcha mos mahsulotlarni (limitsiz) eng uzoq sotilmaganidan boshlab qaytaradi

async function getSlowProducts(storeId, date) {
  const lastSaleRows = await Sale.aggregate([
    { $match: { store_id: storeId, status: "active" } },
    { $unwind: "$products" },
    {
      $group: {
        _id: "$products.product_id",
        last_sale: { $max: "$createdAt" },
      },
    },
  ]);
  const lastSaleMap = new Map(
    lastSaleRows.map((r) => [String(r._id), r.last_sale]),
  );

  const products = await Product.find({
    store_id: storeId,
    quantity: { $gt: 0 },
  }).select("product_name quantity purchase_price createdAt");

  return products
    .map((p) => {
      const lastSale = lastSaleMap.get(String(p._id)) || p.createdAt;
      const days_without_sale = diffInDays(date, lastSale);
      return {
        product_id: p._id,
        name: p.product_name,
        days_without_sale,
        stock: p.quantity,
        stock_value: p.quantity * p.purchase_price,
      };
    })
    .filter((p) => p.days_without_sale >= SLOW_PRODUCT_THRESHOLD_DAYS)
    .sort((a, b) => b.days_without_sale - a.days_without_sale);
}

// ---------- O'sish / kamayishning asosiy sababi (kategoriya) ----------

/**
 * direction = "up"   -> eng katta ijobiy delta, u umumiy o'sishning kamida 40%i
 * direction = "down" -> eng katta manfiy delta, u umumiy kamayishning kamida 40%i
 * Delta = tanlangan_kun_daromadi - oldingi_kun_daromadi (shu ikki kunning
 * birortasida sotilgan barcha kategoriyalar bo'yicha). Shart bajarilmasa null.
 */
async function getDriverCategory(storeId, date, direction) {
  const revenueByCategory = async (start, end) =>
    Sale.aggregate([
      {
        $match: {
          store_id: storeId,
          status: "active",
          createdAt: { $gte: start, $lte: end },
        },
      },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.product_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category_id",
          revenue: {
            $sum: {
              $multiply: ["$products.quantity", "$products.selling_price"],
            },
          },
        },
      },
    ]);

  const [todayData, yesterdayData] = await Promise.all([
    revenueByCategory(startOfDay(date), endOfDay(date)),
    revenueByCategory(startOfDay(subDays(date, 1)), endOfDay(subDays(date, 1))),
  ]);

  const todayMap = new Map(todayData.map((c) => [String(c._id), c.revenue]));
  const yesterdayMap = new Map(
    yesterdayData.map((c) => [String(c._id), c.revenue]),
  );
  const rawIds = new Map();
  [...todayData, ...yesterdayData].forEach((c) =>
    rawIds.set(String(c._id), c._id),
  );

  const deltas = [...rawIds.keys()].map((key) => ({
    key,
    delta: (todayMap.get(key) || 0) - (yesterdayMap.get(key) || 0),
  }));
  if (!deltas.length) return null;

  const totalDelta = deltas.reduce((s, d) => s + d.delta, 0);

  let top;
  if (direction === "up") {
    if (totalDelta <= 0) return null;
    top = deltas.reduce((a, b) => (b.delta > a.delta ? b : a));
    if (top.delta < totalDelta * GROWTH_DRIVER_SHARE) return null;
  } else {
    if (totalDelta >= 0) return null;
    top = deltas.reduce((a, b) => (b.delta < a.delta ? b : a));
    if (top.delta > totalDelta * GROWTH_DRIVER_SHARE) return null;
  }

  const categoryId = rawIds.get(top.key);
  if (categoryId === null || categoryId === undefined) return null;

  const category = await Category.findById(categoryId).select("category_name");
  return category ? { name: category.category_name } : null;
}

// ---------- OpenAI ----------

const SYSTEM_PROMPT = `
Sen MARK1 CRM tizimi uchun matn generatsiya qiluvchi modulsan.
Senga tayyor hisoblangan qiymatlar JSON formatida beriladi. Sening
vazifang — bu qiymatlarni QAT'IY belgilangan shablon bo'yicha,
faqat qavs ichidagi joylarni to'ldirib, gap tuzilishini o'zgartirmasdan yozish.

QAT'IY QOIDALAR:
- Hech qanday matematik hisob-kitob qilma — barcha qiymatlar JSON'da
  tayyor holda berilgan, faqat ko'chir.
- Pul miqdorlari JSON'da tayyor matn ("1.2 mln so'm", "620 ming so'm")
  ko'rinishida berilgan — aynan shundayligicha ko'chir, o'zgartirma.
- Sana JSON'da "date_label" maydonida tayyor ("29-sentabr") — aynan shunday ko'chir.
- "Bugun" yoki "kecha" so'zlarini ishlatma, faqat shablondagi so'zlarni yoz.
- Hech qanday raqam yoki faktni o'ylab topma.
- Agar biror shart bajarilmasa (maydon null yoki 0 bo'lsa), o'sha
  jumla butunlay TASHLAB KETILADI.
- Jumlalar quyidagi tartibda, bitta abzasda, bo'sh joy bilan ajratib yoziladi.

SHABLON:

[date_label] kungi biznes tahlili:
1) [agar sales.change mavjud va sales.change.direction "oshdi" yoki "kamaydi": "Savdo oldingi kunga nisbatan [sales.change.pct]% [sales.change.direction]."]
   [agar sales.change.direction "o'zgarmadi": "Savdo oldingi kun bilan deyarli bir xil bo'ldi."]
2) [agar growth_driver mavjud: "[growth_driver.label] asosiy qismi [growth_driver.name] dan keldi."]
3) [agar top_product mavjud:
   - top_product.velocity_direction "tez" yoki "sekin" bo'lsa: "[top_product.name] odatdagidan [top_product.velocity_change_pct]% [top_product.velocity_direction] sotildi va hozir [top_product.current_stock] dona qoldi."
   - "odatdagidek" bo'lsa: "[top_product.name] odatdagidek sotildi va hozir [top_product.current_stock] dona qoldi."
   - keyin, agar top_product.days_of_stock_left null bo'lmasa: "Oxirgi 7 kunlik savdo tezligida taxminan [top_product.days_of_stock_left] kunga yetadi."]
4) [agar slow_products.count > 0: "[slow_products.count] ta mahsulot [slow_products.min_days_without_sale] kundan beri sotilmagan. Ularda [slow_products.total_stock_value] miqdorida kapital turibdi. Eng uzoq sotilmagani — [slow_products.slowest.name] ([slow_products.slowest.days] kun)."]
5) [agar sales.transactions = 0: "[date_label] kuni savdo qilinmadi."]
   [aks holda: "[date_label] kuni [sales.revenue] miqdorida savdo qilindi[, agar debts.new_debt mavjud: ", shundan [debts.new_debt] qarzga berildi"]."]
6) [agar sales.transactions > 0: "Jami [sales.transactions] ta sotuv bo'ldi[, agar sales.average_check mavjud: ", o'rtacha chek [sales.average_check]"]."]
7) [agar sales.transactions > 0: "Sof [sales.profit_label] [sales.profit][, agar sales.profit_margin_pct mavjud: " ([sales.profit_margin_pct]%)"]."]
8) [agar sales.last_7_days_average mavjud: "Oldingi 7 kunda kuniga o'rtacha [sales.last_7_days_average] savdo qilingan."]
9) [agar debts.collected mavjud: "Shu kuni qarzlardan [debts.collected] undirildi."]
10) [agar debts.overdue_clients > 0: "[debts.overdue_clients] mijozning jami [debts.overdue] qarzi muddati o'tgan."]
11) [agar inventory.low_stock_count > 0: "Hozirgi holatda [inventory.low_stock_count] ta mahsulot minimal qoldiqqa yetgan yoki tugagan."]
12) [agar inventory.inventory_value mavjud: "Hozirgi holatda ombordagi tovarlar qiymati [inventory.inventory_value]."]
Tavsiya: [1-3 ta qisqa amaliy tavsiya, vergul bilan ajratilgan, oxirgisidan oldin "va"].

TAVSIYA FAQAT QUYIDAGI HOLATLARDAN TANLANADI (mos kelganlaridan eng muhim 1-3 tasi):
- slow_products.count > 0 -> "uzoq sotilmagan mahsulotlarga chegirma qilish"
- debts.overdue_clients > 0 -> "muddati o'tgan qarzdor mijozlar bilan bog'lanish"
- top_product mavjud va top_product.days_of_stock_left mavjud va 3 dan oshmasa -> "[top_product.name] zaxirasini to'ldirish"
- inventory.low_stock_count > 0 -> "minimal qoldiqqa yetgan mahsulotlarni buyurtma qilish"
- sales.change.direction "kamaydi" -> "savdo kamayishi sabablarini tekshirish"
- sales.profit_label "zarar" -> "narx va tannarxni qayta ko'rib chiqish"
Agar hech biri mos kelmasa: "Tavsiya: Hozircha alohida choralar talab qilinmaydi."

Format: faqat oddiy matn, markdown belgilarsiz, o'zbek tilida (lotin),
ishbilarmon va sodda uslubda.
`.trim();

async function callOpenAI(computed) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 800,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Quyidagi tayyor qiymatlar asosida shablonni to'ldir:\n\n${JSON.stringify(
            computed,
            null,
            2,
          )}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI xatosi: ${response.status} ${await response.text()}`,
    );
  }
  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error("OpenAI bo'sh javob qaytardi");
  }
  if (choice.finish_reason === "length") {
    throw new Error("OpenAI javobi max_tokens tufayli kesilib qoldi");
  }
  return choice.message.content.trim();
}

// ---------- Controller ----------

async function getAiOverview(req, res) {
  try {
    // MUHIM: aggregate() $match, find()/countDocuments()dan farqli o'laroq,
    // stringni ObjectId'ga avtomatik o'girmaydi — shuning uchun bu yerda
    // majburan cast qilamiz, aks holda barcha aggregate natijalar bo'sh/0
    // qaytadi.
    const store_id = new mongoose.Types.ObjectId(req.user.store_id);
    const period = req.query.period || "daily";
    if (!["daily"].includes(period)) {
      return res
        .status(400)
        .json({ message: "Faqat 'daily' period qo'llab-quvvatlanadi" });
    }

    const date = req.query.date ? parseDDMMYYYY(req.query.date) : new Date();
    if (!date) {
      return res.status(400).json({
        message: "date parametri DD-MM-YYYY formatida bo'lishi kerak",
      });
    }

    // Avval saqlangan overview bo'lsa, qayta hisoblamasdan qaytaramiz
    const existing = await AiOverview.findOne({
      store_id,
      period,
      date: startOfDay(date),
    });
    if (existing && req.query.force !== "true") {
      return res.json(existing);
    }

    const [sales, debts, inventory, topProducts, slowProducts] =
      await Promise.all([
        getSalesStats(store_id, date),
        getDebtsStats(store_id, date),
        getInventoryStats(store_id),
        getTopProducts(store_id, date),
        getSlowProducts(store_id, date), // barcha sekin mahsulotlar
      ]);

    // --- Savdo o'zgarishi ---
    const revenueChange = buildChange(sales.revenue, sales.yesterday_revenue);

    // --- O'sish / kamayish sababi ---
    let growth_driver = null;
    if (
      revenueChange &&
      (revenueChange.direction === "oshdi" ||
        revenueChange.direction === "kamaydi")
    ) {
      const isUp = revenueChange.direction === "oshdi";
      const cat = await getDriverCategory(store_id, date, isUp ? "up" : "down");
      if (cat) {
        growth_driver = {
          label: isUp ? "O'sishning" : "Kamayishning",
          name: cat.name,
        };
      }
    }

    // --- Eng yaxshi mahsulot ---
    let top_product = null;
    if (topProducts.length) {
      const best = topProducts[0];
      const product = await Product.findById(best.product_id).select(
        "product_name quantity",
      );
      const avg_daily_qty = await getAvgDailyQty(
        store_id,
        best.product_id,
        date,
      );
      if (product && avg_daily_qty > 0) {
        const velocity = pct(best.quantity_sold, avg_daily_qty);
        top_product = {
          name: product.product_name,
          velocity_direction:
            velocity > 0 ? "tez" : velocity < 0 ? "sekin" : "odatdagidek",
          velocity_change_pct: Math.abs(velocity),
          current_stock: product.quantity,
          days_of_stock_left:
            product.quantity > 0
              ? Math.max(1, Math.round(product.quantity / avg_daily_qty))
              : null,
        };
      }
    }

    // --- Sekin mahsulotlar (barchasi bo'yicha) ---
    const slow_products_summary = {
      count: slowProducts.length,
      min_days_without_sale: slowProducts.length
        ? slowProducts[slowProducts.length - 1].days_without_sale
        : 0,
      total_stock_value: slowProducts.length
        ? formatMoney(slowProducts.reduce((s, p) => s + p.stock_value, 0))
        : null,
      slowest: slowProducts.length
        ? {
            name: slowProducts[0].name,
            days: slowProducts[0].days_without_sale,
          }
        : null,
    };

    // --- AI'ga beriladigan tayyor qiymatlar ---
    const isProfit = sales.profit >= 0;
    const computed = {
      date: toYMD(date),
      date_label: toDateLabel(date),
      sales: {
        revenue: formatMoney(sales.revenue),
        change: revenueChange,
        transactions: sales.transactions,
        average_check:
          sales.transactions > 0
            ? formatMoney(sales.revenue / sales.transactions)
            : null,
        profit_label: isProfit ? "foyda" : "zarar",
        profit: formatMoney(Math.abs(sales.profit)),
        profit_margin_pct:
          isProfit && sales.profit > 0 && sales.revenue > 0
            ? Math.round((sales.profit / sales.revenue) * 100)
            : null,
        last_7_days_average:
          sales.last_7_days_average > 0
            ? formatMoney(sales.last_7_days_average)
            : null,
      },
      growth_driver,
      top_product,
      slow_products: slow_products_summary,
      debts: {
        new_debt: debts.new_debt > 0 ? formatMoney(debts.new_debt) : null,
        collected: debts.collected > 0 ? formatMoney(debts.collected) : null,
        overdue: debts.overdue > 0 ? formatMoney(debts.overdue) : null,
        overdue_clients: debts.overdue_clients,
      },
      inventory: {
        low_stock_count: inventory.low_stock_count,
        inventory_value:
          inventory.inventory_value > 0
            ? formatMoney(inventory.inventory_value)
            : null,
      },
    };

    const ai_overview = await callOpenAI(computed);

    const doc = await AiOverview.findOneAndUpdate(
      { store_id, period, date: startOfDay(date) },
      {
        store_id,
        period,
        date: startOfDay(date),
        sales,
        debts,
        inventory,
        top_products: topProducts,
        slow_products: slowProducts.slice(0, SLOW_PRODUCT_LIMIT).map((p) => ({
          product_id: p.product_id,
          days_without_sale: p.days_without_sale,
          stock: p.stock,
          stock_value: p.stock_value,
        })),
        ai_overview,
      },
      { upsert: true, new: true },
    );

    return res.json(doc);
  } catch (err) {
    console.error("getAiOverview xatosi:", err);
    return res
      .status(500)
      .json({ message: "AI overview hisoblashda xatolik", error: err.message });
  }
}

module.exports = { getAiOverview };

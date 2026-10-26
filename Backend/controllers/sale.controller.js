const mongoose = require("mongoose");
const { randomUUID } = require("crypto");
const Sale = require("../models/sale.model");
const Product = require("../models/product.model");
const Client = require("../models/client.model");
const parseDate = require("../utils/date.util");
const ExcelJS = require("exceljs");
const sendSms = require("../utils/sms.util");

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
      opening_record = 0,
    } = req.body;
    const { store_id } = req.user;

    // QA-BUGFIX: to'lov qiymatlari faqat son bo'lishi va manfiy bo'lmasligi
    // kerak. Avval faqat `paid_by_cash < 0` tekshirilardi — "abc" kabi
    // qiymat NaN berib, hisob-kitobni butunlay buzardi.
    for (const [field, value] of [
      ["paid_by_cash", paid_by_cash],
      ["paid_by_card", paid_by_card],
      ["opening_record", opening_record],
    ]) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new Error(
          `${field} manfiy bo'lmagan son bo'lishi kerak`,
        );
      }
    }

    // CF-10 fix: Mijoz mavjudligi va joriy do'konga tegishliligi tekshiruvi
    if (client_id) {
      const clientDoc = await Client.findOne({
        _id: client_id,
        store_id,
      }).session(session);
      if (!clientDoc) {
        throw new Error("Tanlangan mijoz topilmadi yoki boshqa do'konga tegishli");
      }
    }

    let sale;

    if (opening_record > 0) {
      // Eski qarzni POSga ko'chirish holati
      // QA-BUGFIX: xaridorsiz "ochilish qarzi" yaratilsa, u hech bir
      // qarzdorga bog'lanmaydi va qarzdorlar sahifasida ko'rinmay qoladi —
      // pul esa haqiqatda qarz sifatida qoladi. Shuning uchun bloklaymiz.
      if (!client_id) {
        throw new Error("Qarz uchun xaridor tanlanishi kerak");
      }

      sale = new Sale({
        store_id,
        client_id,
        products: [],
        note,
        total_purchase: 0,
        total_price: opening_record,
        total_paid: 0,
        total_remaining: opening_record,
        paid_by_cash: 0,
        paid_by_card: 0,
        due_date,
        payments: [],
        sms_sent: true,
        status: "active",
      });

      await sale.save({ session });
    } else {
      let saleProducts = [];
      let total_price = 0;
      let total_purchase = 0;
      const total_paid = paid_by_card + paid_by_cash;

      if (!Array.isArray(products) || products.length === 0) {
        throw new Error("Savdoda kamida bitta mahsulot bo'lishi kerak");
      }

      for (const item of products) {
        // CF-11 fix: Manfiy yoki nol miqdor tekshiruvi
        // QA-BUGFIX: "abc"/null kabi qiymatlar ham rad etilishi kerak —
        // aks holda `product.quantity -= "abc"` omborni NaN qilardi.
        if (
          typeof item.quantity !== "number" ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0
        ) {
          throw new Error("Mahsulot miqdori 0 dan katta son bo'lishi kerak");
        }
        if (
          item.selling_price !== undefined &&
          item.selling_price !== null &&
          (typeof item.selling_price !== "number" ||
            !Number.isFinite(item.selling_price) ||
            item.selling_price < 0)
        ) {
          throw new Error("Mahsulot narxi manfiy bo'lmagan son bo'lishi kerak");
        }

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

        // Tannarx HAR DOIM bazadan olinadi — client yuborgan qiymat emas.
        // (Eski kodda item.purchase_price ishlatilardi: noto'g'ri tannarx
        // kiritilsa, foyda statistikasi butunlay buzilardi.)
        //
        // Sotuv narxi esa kelishilgan narx bo'lishi mumkin (chegirma),
        // shuning uchun clientdan olinadi; yuborilmasa bazadagi narx.
        const purchasePrice = Number(product.purchase_price) || 0;
        const sellingPrice =
          item.selling_price !== undefined && item.selling_price !== null
            ? Number(item.selling_price)
            : Number(product.selling_price) || 0;

        saleProducts.push({
          product_id: product._id,
          purchase_price: purchasePrice,
          selling_price: sellingPrice,
          quantity: item.quantity,
        });

        total_price += sellingPrice * item.quantity;
        total_purchase += purchasePrice * item.quantity;
      }

      const total_remaining = total_price - total_paid;

      // QA-BUGFIX: ortiqcha to'lovni bloklash. Avval 1000 so'mlik savdoga
      // 999 999 so'm to'lov qabul qilinib, total_remaining = -998 999 bo'lib
      // qolardi — bu qarzdorlik statistikasini va kassani buzadi.
      if (total_paid > total_price) {
        throw new Error(
          "To'lov summasi savdo summasidan katta bo'lishi mumkin emas",
        );
      }

      // QA-BUGFIX: qoldiq > 0 bo'lsa, bu qarz — xaridor majburiy.
      // Aks holda qarz hech bir qarzdorga bog'lanmay, "yo'qolgan" pul bo'lib qoladi.
      if (total_remaining > 0 && !client_id) {
        throw new Error("Qarz savdosi uchun xaridor tanlanishi kerak");
      }

      const payments = [];

      if (paid_by_cash > 0) {
        payments.push({
          // QA-BUGFIX: har bir to'lovga unikal payment_id beriladi.
          // Sabab: {store_id, "payments.payment_id"} unique indeksida
          // payment_id yo'q to'lovlar null bo'lib indekslanadi va bitta
          // do'konda ikkinchi shunday hujjat E11000 (500) beradi.
          payment_id: randomUUID(),
          amount: paid_by_cash,
          payment_method: "cash",
          paid_at: new Date(),
        });
      }

      if (paid_by_card > 0) {
        payments.push({
          payment_id: randomUUID(),
          amount: paid_by_card,
          payment_method: "card",
          paid_at: new Date(),
        });
      }

      sale = new Sale({
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
    }

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
  const { sale_id } = req.query;
  if (!sale_id || !mongoose.Types.ObjectId.isValid(sale_id)) {
    return res.status(400).json({ message: "sale_id noto'g'ri" });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { store_id } = req.user;

    const sale = await Sale.findOne({
      _id: sale_id,
      store_id,
    }).session(session);

    if (!sale) {
      throw new Error("Sotuv topilmadi");
    }

    // CF-09 fix: Qayta bekor qilish yoki zaxirani cheksiz ko'paytirishni bloklash
    if (sale.status !== "active") {
      throw new Error("Faqat faol sotuvni bekor qilish mumkin (allaqachon bekor qilingan yoki qaytarilgan)");
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

    return res.status(400).json({
      message: err.message,
    });
  } finally {
    session.endSession();
  }
};

exports.returnSale = async (req, res) => {
  const { sale_id } = req.query;
  if (!sale_id || !mongoose.Types.ObjectId.isValid(sale_id)) {
    return res.status(400).json({ message: "sale_id noto'g'ri" });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { store_id } = req.user;

    const sale = await Sale.findOne({
      _id: sale_id,
      store_id,
    }).session(session);

    if (!sale) {
      throw new Error("Sotuv topilmadi");
    }

    // CF-09 fix: Qayta qaytarishni bloklash
    if (sale.status !== "active") {
      throw new Error("Faqat faol sotuvni qaytarish mumkin (allaqachon bekor qilingan yoki qaytarilgan)");
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

    return res.status(400).json({
      message: err.message,
    });
  } finally {
    session.endSession();
  }
};

exports.addPayment = async (req, res) => {
  const { sale_id } = req.query;
  const { amount, payment_method, payment_id } = req.body;
  const { store_id } = req.user;

  try {
    // CF-13 fix: Manfiy yoki nol summa tekshiruvi
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        message: "To'lov summasi musbat son bo'lishi kerak",
      });
    }

    // Eski mijozlar payment_method yubormasligi mumkin — naqd deb qabul qilamiz.
    const method =
      payment_method === undefined || payment_method === null || payment_method === ""
        ? "cash"
        : payment_method;

    if (!["cash", "card"].includes(method)) {
      return res.status(400).json({
        message: "To'lov usuli xato",
      });
    }

    if (!mongoose.isValidObjectId(sale_id)) {
      return res.status(400).json({
        message: "Sotuv ID noto'g'ri",
      });
    }

    // Idempotentlik: bir xil payment_id bilan takroriy so'rov kelsa,
    // to'lovni ikkinchi marta yozmasdan mavjud sotuvni qaytaramiz.
    if (payment_id) {
      const existing = await Sale.findOne({
        _id: sale_id,
        store_id,
        "payments.payment_id": payment_id,
      });

      if (existing) {
        return res.status(200).json({
          message: "To'lov allaqachon qo'shilgan",
          sale: existing,
          idempotent: true,
        });
      }
    }

    const inc = {
      total_remaining: -amount,
      total_paid: amount,
    };
    inc[method === "cash" ? "paid_by_cash" : "paid_by_card"] = amount;

    // Atomar yangilash: qoldiq tekshiruvi va inkrementlar bitta
    // MongoDB operatsiyasida bajariladi — parallel to'lovlarda
    // qoldiq manfiyga tushmaydi.
    const sale = await Sale.findOneAndUpdate(
      {
        _id: sale_id,
        store_id,
        status: "active",
        $expr: { $lte: [amount, "$total_remaining"] },
      },
      {
        $push: {
          payments: {
            amount,
            paid_at: new Date(),
            payment_method: method,
            // QA-BUGFIX: har doim unikal id (null indeks to'qnashuvini yo'qotadi).
            payment_id: payment_id || randomUUID(),
          },
        },
        $inc: inc,
      },
      { returnDocument: "after" },
    );

    if (!sale) {
      const existingSale = await Sale.findOne({ _id: sale_id, store_id });

      if (!existingSale) {
        return res.status(404).json({ message: "Sotuv topilmadi" });
      }

      if (existingSale.status !== "active") {
        return res.status(400).json({
          message: "Faqat faol sotuvga to'lov qo'shish mumkin",
        });
      }

      return res.status(400).json({
        message: "To'lov summasi qolgan qarzdan katta bo'lishi mumkin emas",
      });
    }

    return res.status(200).json({
      message: "To'lov muvaffaqiyatli qo'shildi",
      sale,
    });
  } catch (err) {
    // Parallel so'rovlar bir xil payment_id bilan kelganda unique indeks
    // 11000 xatosini beradi — bu holatda to'lov allaqachon yozilgan.
    if (err && err.code === 11000 && payment_id) {
      const existing = await Sale.findOne({
        _id: sale_id,
        store_id,
        "payments.payment_id": payment_id,
      });

      if (existing) {
        return res.status(200).json({
          message: "To'lov allaqachon qo'shilgan",
          sale: existing,
          idempotent: true,
        });
      }
    }

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
      page = 1,
      limit = 20,
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

    // Pagination
    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const skip = (currentPage - 1) * perPage;

    // Sort
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

    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate("client_id")
        .populate("products.product_id")
        .sort(sort)
        .skip(skip)
        .limit(perPage)
        .lean(),

      Sale.countDocuments(filter),
    ]);

    return res.status(200).json({
      sales,

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

exports.sendManualReminder = async (req, res) => {
  try {
    const { sale_id } = req.query;
    if (!sale_id || !mongoose.Types.ObjectId.isValid(sale_id)) {
      return res.status(400).json({ message: "sale_id noto'g'ri" });
    }
    const { store_id } = req.user;
    const sale = await Sale.findOne({ _id: sale_id, store_id }).populate([
      { path: "client_id", select: "client_phone client_name" },
      { path: "store_id", select: "store_name" },
    ]);
    if (!sale) {
      return res.status(400).json({ message: "Sotuv mavjud emas" });
    }
    if (!sale.client_id) {
      return res.status(400).json({
        message: "Ushbu sotuvda xaridor biriktirilmagan",
      });
    }
    if (sale.total_remaining === 0) {
      return res
        .status(400)
        .json({ message: "Ushbu sotuvda qarzdorlik mavjud emas" });
    }
    if (!sale.client_id.client_phone) {
      return res.status(400).json({
        message: "Ushbu sotuvning xaridorida yaroqli telefon raqam mavjud emas",
      });
    }

    const message = `Hurmatli ${sale.client_id.client_name}, sizning ${sale.store_id.store_name} oldidagi ${formatNumber(sale.total_remaining)} so'm qarzingizni to'lash vaqti ertaga keladi. Iltimos, o'z vaqtida to'lang.`;

    const result = await sendSms(sale.client_id.client_phone, message);

    if (result.success) {
      return res.status(200).json({
        message: "Sms muvaffaqiyatli yuborildi",
        client: sale.client_id,
        sms_message: message,
      });
    } else {
      return res.status(400).json({
        message: "Sms yuborishda xatolik",
        error: result?.error,
      });
    }
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

// --- Helperlar ---

function formatNumber(num) {
  return Number(num || 0).toLocaleString("ru-RU");
}

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatDateTime(date) {
  if (!date) return "";
  const d = new Date(date);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)} ${hh}:${min}`;
}

const STATUS_LABELS = {
  active: "Faol",
  cancelled: "Bekor qilingan",
  returned: "Qaytarilgan",
};

const PAYMENT_METHOD_LABELS = {
  cash: "Naqd",
  card: "Karta",
};

function getClientName(client_id) {
  if (!client_id) return "-";
  return client_id.client_name || "-";
}

function getClientPhone(client_id) {
  if (!client_id) return "-";
  return client_id.client_phone || "-";
}

function styleHeaderRow(row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE9E9E9" },
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
  });
}

// --- Har bir sheet uchun workbook yasovchi funksiyalar ---

function buildSalesWorkbook(sales) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sotuvlar");

  sheet.columns = [
    { header: "ID", key: "id", width: 26 },
    { header: "Sana", key: "date", width: 18 },
    { header: "Xaridor", key: "client", width: 20 },
    { header: "Telefon", key: "phone", width: 14 },
    { header: "Mahsulotlar", key: "products", width: 12 },
    { header: "Jami tannarx", key: "total_purchase", width: 14 },
    { header: "Jami narx", key: "total_price", width: 14 },
    { header: "To'langan", key: "total_paid", width: 14 },
    { header: "Qarz", key: "total_remaining", width: 12 },
    { header: "Naqd", key: "paid_by_cash", width: 12 },
    { header: "Karta", key: "paid_by_card", width: 12 },
    { header: "Muddat", key: "due_date", width: 14 },
    { header: "Status", key: "status", width: 16 },
    { header: "Izoh", key: "note", width: 24 },
  ];
  styleHeaderRow(sheet.getRow(1));

  for (const sale of sales) {
    sheet.addRow({
      id: String(sale._id),
      date: formatDateTime(sale.createdAt),
      client: getClientName(sale.client_id),
      phone: getClientPhone(sale.client_id),
      products: `${sale.products?.length || 0} xil`,
      total_purchase: formatNumber(sale.total_purchase),
      total_price: formatNumber(sale.total_price),
      total_paid: formatNumber(sale.total_paid),
      total_remaining: formatNumber(sale.total_remaining),
      paid_by_cash: formatNumber(sale.paid_by_cash),
      paid_by_card: formatNumber(sale.paid_by_card),
      due_date: formatDate(sale.due_date),
      status: STATUS_LABELS[sale.status] || sale.status,
      note: sale.note || "",
    });
  }

  return workbook;
}

function buildSaleItemsWorkbook(sales) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sotuv tovarlari");

  sheet.columns = [
    { header: "Sale ID", key: "sale_id", width: 26 },
    { header: "Sana", key: "date", width: 14 },
    { header: "Xaridor", key: "client", width: 20 },
    { header: "Mahsulot", key: "product", width: 22 },
    { header: "Barcode", key: "barcode", width: 16 },
    { header: "Tannarx", key: "purchase_price", width: 12 },
    { header: "Sotuv narxi", key: "selling_price", width: 12 },
    { header: "Miqdor", key: "quantity", width: 10 },
    { header: "Jami", key: "total", width: 14 },
  ];
  styleHeaderRow(sheet.getRow(1));

  for (const sale of sales) {
    for (const item of sale.products || []) {
      const product = item.product_id;
      const total = (item.selling_price || 0) * (item.quantity || 0);
      sheet.addRow({
        sale_id: String(sale._id),
        date: formatDate(sale.createdAt),
        client: getClientName(sale.client_id),
        product: product?.product_name || "-",
        barcode: product?.product_barcode || "-",
        purchase_price: formatNumber(item.purchase_price),
        selling_price: formatNumber(item.selling_price),
        quantity: item.quantity || 0,
        total: formatNumber(total),
      });
    }
  }

  return workbook;
}

function buildPaymentsWorkbook(sales) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sotuv to'lovlari");

  sheet.columns = [
    { header: "Sale ID", key: "sale_id", width: 26 },
    { header: "Sana", key: "date", width: 14 },
    { header: "Xaridor", key: "client", width: 20 },
    { header: "To'lov summasi", key: "amount", width: 16 },
    { header: "To'lov turi", key: "method", width: 14 },
    { header: "To'lov vaqti", key: "paid_at", width: 18 },
  ];
  styleHeaderRow(sheet.getRow(1));

  for (const sale of sales) {
    for (const payment of sale.payments || []) {
      sheet.addRow({
        sale_id: String(sale._id),
        date: formatDate(sale.createdAt),
        client: getClientName(sale.client_id),
        amount: formatNumber(payment.amount),
        method:
          PAYMENT_METHOD_LABELS[payment.payment_method] ||
          payment.payment_method,
        paid_at: formatDateTime(payment.paid_at),
      });
    }
  }

  return workbook;
}

// --- Asosiy controller ---
// GET /sales/export?type=sales|items|payments&client_id=...&status=...&start_date=...&end_date=...

const EXPORT_TYPES = {
  sales: {
    build: buildSalesWorkbook,
    fileLabel: "Sotuvlar",
  },
  items: {
    build: buildSaleItemsWorkbook,
    fileLabel: "Sotuv tovarlari",
  },
  payments: {
    build: buildPaymentsWorkbook,
    fileLabel: "Sotuv tolovlari",
  },
};

exports.exportSales = async (req, res) => {
  try {
    const { store_id } = req.user;
    const {
      client_id,
      product_id,
      status = "active",
      start_date,
      end_date,
      type = "sales",
    } = req.query;

    if (!EXPORT_TYPES[type]) {
      return res.status(400).json({
        message:
          "type quyidagilardan biri bo'lishi kerak: sales, items, payments",
      });
    }

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

    const sales = await Sale.find(filter)
      .populate("client_id")
      .populate("products.product_id")
      .sort({ createdAt: -1 });

    const todayLabel = formatDate(new Date());
    const { build, fileLabel } = EXPORT_TYPES[type];
    const workbook = build(sales);
    const filename = `${fileLabel} – ${todayLabel}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );

    await workbook.xlsx.write(res);
  } catch (err) {
    console.log(err.message);
    if (!res.headersSent) {
      return res.status(500).json({
        message: err.message,
      });
    }
  }
};

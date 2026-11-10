const mongoose = require("mongoose");
const Sale = require("../models/sale.model");
const Product = require("../models/product.model");
const Client = require("../models/client.model");
const AiOverview = require("../models/aioverview.model");

const MODEL = process.env.AI_ADVISOR_MODEL || "gpt-4o-mini";
const MAX_STEPS = 5;
const MAX_RECS = 4;
const TARGET_STOCK_DAYS = 14; // zaxira necha kunga yetarli bo'lishi kerak
const MIN_MARGIN_AFTER_DISCOUNT = 1.05; // chegirmadan keyin ham tannarxdan 5% yuqori
const DAY_MS = 86400000;

const isId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
const toOid = (v) => new mongoose.Types.ObjectId(v);

// ---------- Tool'lar ----------

const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "get_reorder_candidates",
      description:
        "Zaxirasi tugayotgan mahsulotlar: qoldiq, kunlik o'rtacha sotuv, necha kunga yetishi va tavsiya etilgan buyurtma miqdori (kod hisoblagan).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description:
        "Bitta mahsulot bo'yicha chuqur ma'lumot: narx, marja, oxirgi 8 hafta sotuvi, oxirgi sotilgan kun, chegirma uchun xavfsiz maksimal foiz.",
      parameters: {
        type: "object",
        properties: { product_id: { type: "string" } },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_overdue_clients",
      description:
        "Muddati o'tgan qarzi bor mijozlar ro'yxati (eng kattasidan boshlab): ism, jami summa, eng eski muddat necha kun o'tgani.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client_payment_history",
      description:
        "Mijozning to'lov odati: o'rtacha necha kunda to'laydi, necha marta kechikkan, ochiq qarzlari, oxirgi to'lov qachon bo'lgan.",
      parameters: {
        type: "object",
        properties: { client_id: { type: "string" } },
        required: ["client_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_low_margin_products",
      description:
        "Oxirgi 30 kunda sotilgan, lekin foyda marjasi past (10% dan kam yoki manfiy) mahsulotlar.",
      parameters: { type: "object", properties: {} },
    },
  },
];

function createExecutor(storeId, date, util) {
  const { startOfDay, subDays, diffInDays, formatMoney } = util;
  const dayStart = startOfDay(date);
  const anchor = new Date(dayStart.getTime() + DAY_MS); // bugun oxiri

  const soldQtyMap = async (days) => {
    const rows = await Sale.aggregate([
      {
        $match: {
          store_id: storeId,
          status: "active",
          createdAt: { $gte: startOfDay(subDays(date, days)), $lt: anchor },
        },
      },
      { $unwind: "$products" },
      { $group: { _id: "$products.product_id", qty: { $sum: "$products.quantity" } } },
    ]);
    return new Map(rows.map((r) => [String(r._id), r.qty / days]));
  };

  const handlers = {
    async get_reorder_candidates() {
      const avg = await soldQtyMap(14);
      const products = await Product.find({ store_id: storeId })
        .select("product_name quantity minimum_quantity")
        .lean();

      return products
        .map((p) => {
          const a = avg.get(String(p._id)) || 0;
          const daysLeft = a > 0 ? p.quantity / a : null;
          return {
            product_id: String(p._id),
            name: p.product_name,
            stock: p.quantity,
            minimum_quantity: p.minimum_quantity,
            avg_daily_qty: Math.round(a * 10) / 10,
            days_left: daysLeft === null ? null : Math.round(daysLeft * 10) / 10,
            suggested_order_qty:
              a > 0 ? Math.max(0, Math.ceil(a * TARGET_STOCK_DAYS - p.quantity)) : null,
            _a: a,
          };
        })
        .filter(
          (r) =>
            r.stock <= (r.minimum_quantity || 0) ||
            (r.days_left !== null && r.days_left <= 7),
        )
        .sort((x, y) => (x.days_left ?? 1e9) - (y.days_left ?? 1e9))
        .slice(0, 10)
        .map(({ _a, ...rest }) => rest);
    },

    async get_product_details({ product_id }) {
      if (!isId(product_id)) return { error: "Noto'g'ri id" };
      const pid = toOid(product_id);
      const p = await Product.findOne({ _id: pid, store_id: storeId }).lean();
      if (!p) return { error: "Mahsulot topilmadi" };

      const weekly = await Sale.aggregate([
        {
          $match: {
            store_id: storeId,
            status: "active",
            createdAt: { $gte: new Date(anchor.getTime() - 8 * 7 * DAY_MS), $lt: anchor },
          },
        },
        { $unwind: "$products" },
        { $match: { "products.product_id": pid } },
        {
          $group: {
            _id: {
              $floor: {
                $divide: [{ $subtract: [anchor, "$createdAt"] }, 7 * DAY_MS],
              },
            },
            qty: { $sum: "$products.quantity" },
          },
        },
      ]);
      const byWeek = new Map(weekly.map((w) => [w._id, w.qty]));
      const last_8_weeks_qty = Array.from({ length: 8 }, (_, i) => ({
        weeks_ago: i,
        qty: byWeek.get(i) || 0,
      }));

      const lastSale = await Sale.findOne({
        store_id: storeId,
        status: "active",
        "products.product_id": pid,
      })
        .sort({ createdAt: -1 })
        .select("createdAt")
        .lean();

      const price = p.selling_price || 0;
      const cost = p.purchase_price || 0;
      const marginPct = price > 0 ? Math.round(((price - cost) / price) * 100) : null;
      const maxDiscount =
        price > 0
          ? Math.min(
              30,
              Math.max(
                0,
                Math.floor(((price - cost * MIN_MARGIN_AFTER_DISCOUNT) / price) * 100),
              ),
            )
          : 0;
      const recent4 = last_8_weeks_qty.slice(0, 4).reduce((s, w) => s + w.qty, 0);
      const avgDaily = recent4 / 28;

      return {
        product_id,
        name: p.product_name,
        stock: p.quantity,
        selling_price_text: formatMoney(price),
        purchase_price_text: formatMoney(cost),
        margin_pct: marginPct,
        max_safe_discount_pct: maxDiscount,
        stock_value_text: formatMoney(p.quantity * cost),
        days_since_last_sale: lastSale ? diffInDays(date, lastSale.createdAt) : null,
        last_8_weeks_qty,
        days_of_stock_left: avgDaily > 0 ? Math.round(p.quantity / avgDaily) : null,
      };
    },

    async get_overdue_clients() {
      const rows = await Sale.aggregate([
        {
          $match: {
            store_id: storeId,
            status: "active",
            client_id: { $ne: null },
            total_remaining: { $gt: 0 },
            due_date: { $ne: null, $lt: dayStart },
          },
        },
        {
          $group: {
            _id: "$client_id",
            total: { $sum: "$total_remaining" },
            oldest_due: { $min: "$due_date" },
            sales_count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 8 },
        {
          $lookup: { from: "clients", localField: "_id", foreignField: "_id", as: "c" },
        },
        { $unwind: { path: "$c", preserveNullAndEmptyArrays: true } },
      ]);
      return rows.map((r) => ({
        client_id: String(r._id),
        name: r.c?.client_name || "Noma'lum",
        total_overdue_text: formatMoney(r.total),
        days_overdue: diffInDays(date, r.oldest_due),
        overdue_sales_count: r.sales_count,
      }));
    },

    async get_client_payment_history({ client_id }) {
      if (!isId(client_id)) return { error: "Noto'g'ri id" };
      const cid = toOid(client_id);
      const client = await Client.findOne({ _id: cid, store_id: storeId })
        .select("client_name")
        .lean();
      if (!client) return { error: "Mijoz topilmadi" };

      const sales = await Sale.find({
        store_id: storeId,
        client_id: cid,
        status: "active",
        due_date: { $ne: null }, // faqat qarzga berilgan sotuvlar
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .select("createdAt due_date total_remaining payments")
        .lean();

      const closed = sales.filter((s) => s.total_remaining === 0 && s.payments.length);
      const daysToPay = closed.map((s) => {
        const lastPaid = Math.max(...s.payments.map((x) => +new Date(x.paid_at)));
        return Math.max(0, Math.round((lastPaid - +new Date(s.createdAt)) / DAY_MS));
      });
      const lateCount = closed.filter((s) => {
        const lastPaid = Math.max(...s.payments.map((x) => +new Date(x.paid_at)));
        return lastPaid > +new Date(s.due_date) + DAY_MS;
      }).length;

      const open = sales.filter((s) => s.total_remaining > 0);
      const allPayments = sales.flatMap((s) => s.payments.map((x) => +new Date(x.paid_at)));

      return {
        client_id,
        name: client.client_name,
        closed_debts_count: closed.length,
        avg_days_to_pay: daysToPay.length
          ? Math.round(daysToPay.reduce((a, b) => a + b, 0) / daysToPay.length)
          : null,
        late_payments_count: lateCount,
        open_debts_count: open.length,
        open_debts_total_text: formatMoney(open.reduce((s, x) => s + x.total_remaining, 0)),
        days_since_last_payment: allPayments.length
          ? diffInDays(date, new Date(Math.max(...allPayments)))
          : null,
      };
    },

    async get_low_margin_products() {
      const rows = await Sale.aggregate([
        {
          $match: {
            store_id: storeId,
            status: "active",
            createdAt: { $gte: startOfDay(subDays(date, 30)), $lt: anchor },
          },
        },
        { $unwind: "$products" },
        {
          $group: {
            _id: "$products.product_id",
            revenue: { $sum: { $multiply: ["$products.quantity", "$products.selling_price"] } },
            cost: { $sum: { $multiply: ["$products.quantity", "$products.purchase_price"] } },
            qty: { $sum: "$products.quantity" },
          },
        },
        { $match: { revenue: { $gt: 0 } } },
        {
          $addFields: {
            margin_pct: {
              $round: [{ $multiply: [{ $divide: [{ $subtract: ["$revenue", "$cost"] }, "$revenue"] }, 100] }, 0],
            },
          },
        },
        { $match: { margin_pct: { $lt: 10 } } },
        { $sort: { margin_pct: 1 } },
        { $limit: 8 },
        { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "p" } },
        { $unwind: { path: "$p", preserveNullAndEmptyArrays: true } },
      ]);
      return rows.map((r) => ({
        product_id: String(r._id),
        name: r.p?.product_name || "Noma'lum",
        margin_pct: r.margin_pct,
        revenue_30d_text: formatMoney(r.revenue),
        qty_30d: r.qty,
      }));
    },
  };

  return async (name, input) => {
    if (!handlers[name]) return { error: "Noma'lum funksiya" };
    try {
      return await handlers[name](input || {});
    } catch (e) {
      console.error(`Tool ${name} xatosi:`, e.message);
      return { error: "Ma'lumot olishda xatolik" };
    }
  };
}

// ---------- Prompt ----------

const ADVISOR_PROMPT = `
Sen MARK1 CRM uchun tajribali do'kon biznes maslahatchisisan. Senga bugungi
tayyor xulosa, sekin sotilayotgan mahsulot nomzodlari va oldingi tavsiyalar
beriladi. Kerak bo'lsa asboblar bilan chuqurroq tekshir, keyin 1-${MAX_RECS} ta
aniq tavsiya ber.

QOIDALAR:
- Matematik hisob qilma. Buyurtma miqdori (suggested_order_qty), chegirma
  chegarasi (max_safe_discount_pct), marja va pul summalari asboblarda tayyor.
  Faqat ko'chir. Chegirma tavsiya qilsang, max_safe_discount_pct dan oshirma.
- Pul summalari "_text" maydonlarida tayyor matn, aynan shunday ko'chir.
- Raqam yoki faktni o'ylab topma. Faqat xulosa va asbob natijalariga tayan.
- Tavsiya mahsulot yoki mijozga tegishli bo'lsa, ref_id asbob natijasidagi
  product_id yoki client_id bilan AYNAN bir xil bo'lsin.
- Muhimlik tartibi: pul yo'qotilishi yoki qotib qolishi eng muhim. Avval eng
  katta pul ta'siri bo'lganini yoz.
- Oldingi tavsiyalar ro'yxatida "bajarildi" yoki "rad_etildi" bo'lganini
  takrorlama. "yangi" bo'lib qolganini faqat holat yomonlashgan bo'lsa qayta yoz.
- Qarzdor mijoz haqida muloyim yoz, "yomon qarzdor" kabi so'z ishlatma.
  collect_debt uchun message_draft: mijozga yuboriladigan 1-2 gaplik hurmatli
  eslatma matni (summani "_text" dagidek yoz). Boshqa turlarda message_draft null.
- Har tavsiyaning "reason" qismida kamida bitta aniq raqam bo'lsin.
- Hech qanday tavsiya kerak bo'lmasa, bo'sh ro'yxat qaytar.
- O'zbek tilida (lotin), oddiy va ishbilarmon uslubda yoz.

JAVOB FORMATI: faqat JSON obyekt, boshqa matn yo'q:
{"tavsiyalar":[{
  "priority":"yuqori|orta|past",
  "action_type":"reorder|discount|collect_debt|check_margin|investigate_drop|other",
  "title":"qisqa sarlavha",
  "reason":"nima uchun, raqamlar bilan",
  "action":"aniq nima qilish kerak",
  "expected_effect":"taxminiy kutilgan natija (aniq kafolat emas)",
  "ref_type":"product|client|none",
  "ref_id":"id yoki null",
  "message_draft":"matn yoki null"
}]}
`.trim();

// ---------- Agent sikli ----------

async function callOpenAI(messages) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 1500,
      messages,
      tools: toolDefinitions,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI xatosi: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice?.message) throw new Error("OpenAI bo'sh javob qaytardi");
  return choice;
}

// Tool natijalaridan ko'rilgan product_id / client_id larni yig'adi
function collectIds(value, set) {
  if (Array.isArray(value)) return value.forEach((v) => collectIds(v, set));
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if ((k === "product_id" || k === "client_id") && typeof v === "string") set.add(v);
      else collectIds(v, set);
    }
  }
}

function parseJsonLoose(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("JSON topilmadi");
  return JSON.parse(text.slice(start, end + 1));
}

const PRIORITIES = ["yuqori", "orta", "past"];
const ACTIONS = ["reorder", "discount", "collect_debt", "check_margin", "investigate_drop", "other"];

async function runAdvisor({ storeId, date, computed, slowProducts, util }) {
  const execute = createExecutor(storeId, date, util);

  // So'nggi 14 kundagi tavsiyalar va egasi nima qilgani
  const past = await AiOverview.find({
    store_id: storeId,
    date: { $gte: util.subDays(util.startOfDay(date), 14), $lt: util.startOfDay(date) },
  })
    .select("recommendations")
    .lean();
  const pastRecs = past.flatMap((d) =>
    (d.recommendations || []).map((r) => ({
      title: r.title,
      action_type: r.action_type,
      ref_id: r.ref_id,
      status: r.status,
    })),
  );

  const slowCandidates = slowProducts.map((p) => ({
    product_id: String(p.product_id),
    name: p.name,
    days_without_sale: p.days_without_sale,
    stock_value_text: util.formatMoney(p.stock_value),
  }));

  const seenIds = new Set(slowCandidates.map((p) => p.product_id));

  const messages = [
    { role: "system", content: ADVISOR_PROMPT },
    {
      role: "user",
      content: JSON.stringify({
        bugungi_xulosa: computed,
        sekin_mahsulot_nomzodlari: slowCandidates,
        oldingi_tavsiyalar: pastRecs,
      }),
    },
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    const choice = await callOpenAI(messages);
    const msg = choice.message;

    if (!msg.tool_calls?.length) {
      if (choice.finish_reason === "length") throw new Error("Javob kesilib qoldi");
      const data = parseJsonLoose(msg.content || "");
      return sanitize(data.tavsiyalar, seenIds);
    }

    messages.push(msg);
    for (const call of msg.tool_calls) {
      let args = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {}
      const out = await execute(call.function.name, args);
      collectIds(out, seenIds);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(out),
      });
    }
  }
  throw new Error("Agent belgilangan qadamlarda tugamadi");
}

// Model chiqargan tavsiyalarni tekshirish: noto'g'ri tuzilma va to'qilgan id'lar tashlanadi
function sanitize(list, seenIds) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((r) => r && r.title && r.reason && r.action)
    .filter((r) => {
      if (!r.ref_id || r.ref_type === "none") return true;
      return seenIds.has(String(r.ref_id));
    })
    .slice(0, MAX_RECS)
    .map((r) => ({
      priority: PRIORITIES.includes(r.priority) ? r.priority : "orta",
      action_type: ACTIONS.includes(r.action_type) ? r.action_type : "other",
      title: String(r.title).slice(0, 120),
      reason: String(r.reason).slice(0, 500),
      action: String(r.action).slice(0, 500),
      expected_effect: r.expected_effect ? String(r.expected_effect).slice(0, 300) : null,
      ref_type: ["product", "client"].includes(r.ref_type) ? r.ref_type : "none",
      ref_id: r.ref_id && r.ref_type !== "none" ? String(r.ref_id) : null,
      message_draft: r.message_draft ? String(r.message_draft).slice(0, 400) : null,
    }));
}

module.exports = { runAdvisor };
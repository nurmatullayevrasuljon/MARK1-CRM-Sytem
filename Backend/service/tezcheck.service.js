const axios = require("axios");
const crypto = require("crypto");

const BASE_URL = process.env.TEZCHECK_BASE_URL || "https://api.tezcheck.uz";
const API_PREFIX = "/api/merchant/v1";

const API_KEY = process.env.TEZCHECK_API_KEY; // Bearer token (maxfiy)
// Kalit bitta kassaga biriktirilgan bo'lsa shart emas; aks holda kassa kodini yozing
const CASH_DESK_CODE = process.env.TEZCHECK_CASH_DESK_CODE;
const WEBHOOK_SECRET = process.env.TEZCHECK_WEBHOOK_SECRET; // wbs_... (kabinetda webhook qo'shganda beriladi)
// Ixtiyoriy: so'rovlarni HMAC bilan imzolash (kabinetda "faqat imzolangan so'rovlar" yoqilgan bo'lsa shart)
const SIGN_REQUESTS = process.env.TEZCHECK_SIGN_REQUESTS === "true";

if (!API_KEY) console.warn("[tezcheck] TEZCHECK_API_KEY .env da yo'q");
if (!WEBHOOK_SECRET) console.warn("[tezcheck] TEZCHECK_WEBHOOK_SECRET .env da yo'q, webhook'lar rad etiladi");

const http = axios.create({ baseURL: BASE_URL, timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class TezCheckError extends Error {
  constructor(message, { code, status, requestId, retryable, details } = {}) {
    super(message);
    this.name = "TezCheckError";
    this.code = code || "unknown";
    this.status = status || 0; // 0 = javob umuman kelmadi (tarmoq/timeout)
    this.requestId = requestId || null;
    this.retryable = Boolean(retryable);
    this.details = details || null;
  }
}

// Xatolik formati: { error: { code, message, status, request_id, details, retryable } }
function toApiError(err) {
  if (err.response) {
    const e = (err.response.data && err.response.data.error) || {};
    return new TezCheckError(e.message || `TezCheck xatosi (${err.response.status})`, {
      code: e.code,
      status: e.status || err.response.status,
      requestId: e.request_id || err.response.headers["x-request-id"],
      retryable: e.retryable,
      details: e.details,
    });
  }
  return new TezCheckError("TezCheck bilan aloqa o'rnatib bo'lmadi", {
    code: "network",
    status: 0,
    retryable: true,
    details: err.message,
  });
}

/**
 * Har bir urinish qayta imzolanadi (imzo faqat bir marta qabul qilinadi).
 * retries faqat Idempotency-Key bilan yoki o'qish so'rovlarida ishlatiladi: shunda
 * qayta urinish ikkinchi hisob yaratib yubormaydi.
 */
async function request(method, path, { body, idempotencyKey, retries = 0 } = {}) {
  const url = `${API_PREFIX}${path}`;
  const payload = method === "GET" ? undefined : JSON.stringify(body || {});

  for (let attempt = 0; ; attempt++) {
    const headers = { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" };
    if (CASH_DESK_CODE) headers["X-Cash-Desk-Code"] = CASH_DESK_CODE;
    if (payload !== undefined) headers["Content-Type"] = "application/json";
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    if (SIGN_REQUESTS) {
      const ts = String(Math.floor(Date.now() / 1000));
      const bodyHash = crypto.createHash("sha256").update(payload || "").digest("hex");
      const sig = crypto
        .createHmac("sha256", API_KEY)
        .update(`${ts}.${method}.${url}.${bodyHash}`)
        .digest("hex");
      headers["X-TezCheck-Timestamp"] = ts;
      headers["X-TezCheck-Signature"] = `v1=${sig}`;
    }

    try {
      const res = await http.request({
        method,
        url,
        data: payload,
        headers,
        transformRequest: [(d) => d], // imzolangan baytlar o'zgarmasligi uchun
      });
      return res.data;
    } catch (err) {
      const apiErr = toApiError(err);
      if (attempt < retries && (apiErr.retryable || apiErr.status === 0)) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      throw apiErr;
    }
  }
}

/** GET /me: kalit va kassa to'g'ri ulanganini tekshirish uchun */
async function me() {
  const res = await request("GET", "/me", { retries: 1 });
  return res.data;
}

/**
 * POST /bills: bir martalik, qat'iy summali hisob.
 * amountSom — so'mda; TezCheck'ga tiyinda (x100) yuboriladi.
 * Qaytadi: { bill, payment_url }. payment_url faqat shu yerda beriladi!
 */
async function createBill({ amountSom, title, description, externalReference, returnUrl, idempotencyKey }) {
  const body = {
    amount_minor: amountSom * 100,
    title,
    external_reference: externalReference,
  };
  if (description) body.description = description;
  if (returnUrl) body.return_url = returnUrl;

  const res = await request("POST", "/bills", { body, idempotencyKey, retries: 2 });
  const data = res.data || {};
  if (!data.bill || !data.bill.id || !data.payment_url) {
    throw new TezCheckError("TezCheck javobida bill yoki payment_url yo'q", {
      code: "bad_response",
      details: res,
    });
  }
  return { bill: data.bill, payment_url: data.payment_url };
}

/** POST /bills/{bill}: to'lov holatini so'rab olish. Qaytadi: { bill, payment } */
async function getBill(billId) {
  const res = await request("POST", `/bills/${encodeURIComponent(billId)}`, { retries: 1 });
  return res.data || {};
}

/** POST /bills/{bill}/cancel: qaytarilmaydi; qayta yuborish xavfsiz */
async function cancelBill(billId, reason, idempotencyKey) {
  const res = await request("POST", `/bills/${encodeURIComponent(billId)}/cancel`, {
    body: { reason },
    idempotencyKey,
    retries: 2,
  });
  return res.data || {};
}

/**
 * Webhook imzosi: v1=hex(HMAC_SHA256(secret, `${timestamp}.${deliveryId}.${rawBody}`))
 * - rawBody XOM baytlar bo'lishi shart (req.rawBody), JSON qayta yozilmaydi
 * - Sarlavhada kalit almashtirish paytida ikkita imzo vergul bilan keladi
 */
function verifyWebhook(req) {
  const raw = req.rawBody;
  const timestamp = req.get("X-Checkout-Timestamp");
  const deliveryId = req.get("X-Checkout-Delivery");
  const header = req.get("X-Checkout-Signature");

  if (!WEBHOOK_SECRET || !raw || !timestamp || !deliveryId || !header) return false;

  // NaN bo'lsa ham rad etilishi uchun "<=" bilan tekshiramiz
  if (!(Math.abs(Date.now() / 1000 - Number(timestamp)) <= 300)) return false;

  const expected = Buffer.from(
    "v1=" +
      crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(`${timestamp}.${deliveryId}.`)
        .update(raw)
        .digest("hex"),
  );

  return header.split(",").some((candidate) => {
    const got = Buffer.from(candidate.trim());
    return got.length === expected.length && crypto.timingSafeEqual(got, expected);
  });
}

module.exports = { TezCheckError, me, createBill, getBill, cancelBill, verifyWebhook };
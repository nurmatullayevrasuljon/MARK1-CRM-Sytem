/**
 * NoSQL Operator Injection & Prototype Pollution Sanitizer Middleware.
 *
 * Express.json() yoki query parser orqali kelgan ob'yektlarda '$' bilan
 * boshlanuvchi MongoDB operatorlari ($ne, $gt, $where, $regex) va
 * prototype pollution (__proto__, constructor, prototype) kalitlarini
 * tozalaydi.
 *
 * Xavfsizlik: Barcha marshrutlar uchun avtomatik himoya beradi.
 */

function sanitize(obj) {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = sanitize(obj[i]);
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    // Prohibited prototype / prototype pollution keys
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      delete obj[key];
      continue;
    }

    // NoSQL operator injection keys (e.g. $ne, $gt, $regex)
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }

    if (typeof obj[key] === "object" && obj[key] !== null) {
      obj[key] = sanitize(obj[key]);
    }
  }

  return obj;
}

function sanitizeMiddleware(req, res, next) {
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
}

module.exports = sanitizeMiddleware;

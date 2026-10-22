// Rate limiting — SMS pumping va brute-force himoyasi.
//
// NIMA UCHUN: OTP endpointlari (signup/verify/resend/forgot/reset) cheksiz
// chaqirilsa, DevSMS hisobidan pul ketadi (SMS pumping) va kod "dazmol"
// qilinishi mumkin. Shu sababli auth/OTP marshrutlariga QAT'IY limit,
// qolgan API'ga esa yumshoq umumiy limit qo'yiladi.
//
// DIQQAT: server Render kabi proxy ortida ishlaydi — server.js'da
// `app.set("trust proxy", 1)` bo'lmasa, barcha so'rov bitta IP dan
// keladi va limit butun foydalanuvchilarni bloklaydi.

const rateLimit = require("express-rate-limit");

// Umumiy API limiti: bir IP dan 15 daqiqada 300 ta so'rov.
// Dashboard bir nechta parallel so'rov yuborgani uchun bu qiymat
// odatdagi foydalanuvchini cheklamaydi.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT_MAX) || 300,
  standardHeaders: "draft-7", // RateLimit-* headerlari
  legacyHeaders: false,
  message: { message: "So'rovlar juda ko'p. Birozdan so'ng urinib ko'ring." },
});

// Auth/OTP limiti: bir IP dan 15 daqiqada 10 ta so'rov.
// (Signup + verify + resend ketma-ket ham shu limit ichida.)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message:
      "Juda ko'p urinish. Iltimos, 15 daqiqadan so'ng qayta urinib ko'ring.",
  },
});

// SMS yuborish (qo'lda eslatma) uchun: bir IP dan 15 daqiqada 20 ta.
const smsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.SMS_RATE_LIMIT_MAX) || 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "SMS yuborish limiti oshib ketdi. Biroz kuting." },
});

module.exports = { apiLimiter, authLimiter, smsLimiter };

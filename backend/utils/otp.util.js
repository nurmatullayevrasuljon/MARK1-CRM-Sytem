const crypto = require("crypto");

// BUG FIX 1: period default 60 -> 300 (5 daqiqa). SMS DevSMS/mobil operator
// orqali 20-90+ soniya kechikishi mumkin, keyin foydalanuvchi kodni qo'lda
// kiritadi (window.prompt orqali). 60 soniya bu jarayon uchun juda tor edi —
// kod to'g'ri kiritilsa ham "Kodning yaroqlilik muddati tugagan" xatosi
// chiqishiga sabab bo'lardi.
//
// BUG FIX 2: Math.random() -> crypto.randomInt(). Math.random() kriptografik
// jihatdan xavfsiz emas; OTP kabi xavfsizlik-muhim qiymatlar uchun Node'ning
// o'rnatilgan crypto.randomInt() ishlatilishi kerak.
function generateOtp(length = 6, period = 300) {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }

  const otp_expires_at = new Date(Date.now() + period * 1000);

  return { otp, otp_expires_at };
}

module.exports = generateOtp;
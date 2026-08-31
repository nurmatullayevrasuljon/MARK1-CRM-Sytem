function generateOtp(length = 6, period = 60) {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }

  const otp_expires_at = new Date(Date.now() + period * 1000);

  return { otp, otp_expires_at };
  // return { otp: "123456", otp_expires_at };
}

module.exports = generateOtp;

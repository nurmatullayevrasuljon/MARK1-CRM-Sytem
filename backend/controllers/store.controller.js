const Store = require("../models/store.model");
const bcrypt = require("bcryptjs");
const generateOtp = require("../utils/otp.util");
const {
  generateRefreshToken,
  generateAccessToken,
  verifyRefreshToken,
} = require("../utils/token.util");
const sendSms = require("../utils/sms.util");

exports.signup = async (req, res) => {
  try {
    const { ceo_name, ceo_phone, store_name, password } = req.body;
    const existingStore = await Store.findOne({ ceo_phone });
    if (existingStore) {
      return res.status(400).json({
        message: "Ushbu telefon raqam bilan avval ro'yhatdan o'tilgan",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Parol kamida 6 xonali bo'lishi kerak",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { otp, otp_expires_at } = generateOtp();

    // const SMS_TEMPLATE = `MARK1 ilovasiga ro‘yxatdan o‘tish uchun tasdiqlash kodingiz: ${otp}. Ushbu kodni hech kimga bermang.`;

    const result = await sendSms(
      ceo_phone,
      null,
      "universal_otp",
      3,
      "MARK1",
      otp,
    );

    if (!result.success) {
      return res
        .status(400)
        .json({ message: `Sms yuborishda xatolik: ${result.error}` });
    }

    await Store.create({
      ceo_name,
      ceo_phone,
      store_name,
      password: hashedPassword,
      otp,
      otp_expires_at,
    });
    return res.status(200).json({
      message: "Hisob yaratildi, hisobni tasdiqlashingiz mumkin",
      verify_data: { ceo_phone, otp_expires_at },
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.verify = async (req, res) => {
  try {
    const { otp, ceo_phone } = req.body;
    const store = await Store.findOne({ ceo_phone });
    if (!store) {
      return res
        .status(400)
        .json({ message: "Telefon raqam bo'yicha do'kon topilmadi" });
    }

    if (store.otp === null) {
      return res
        .status(400)
        .json({ message: "Do'kon allaqachon tasdiqlangan" });
    }

    if (Date.now() > store.otp_expires_at) {
      return res
        .status(400)
        .json({ message: "Kodning yaroqlilik muddati tugagan" });
    }

    if (store.otp !== otp) {
      return res.status(400).json({ message: "Kod xato" });
    }

    store.otp = null;
    store.otp_expires_at = null;

    await store.save();

    const refreshToken = generateRefreshToken({
      id: store._id,
      store_id: store._id,
      role: "ceo",
    });

    const accessToken = generateAccessToken({
      id: store._id,
      store_id: store._id,
      role: "ceo",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth/store/refresh",
    });

    res.status(200).json({
      message: "Hisobga kirish muvaffaqiyatli",
      access_token: accessToken,
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.signin = async (req, res) => {
  try {
    const { ceo_phone, password } = req.body;
    const store = await Store.findOne({ ceo_phone });
    if (!store) {
      return res
        .status(400)
        .json({ message: "Telefon raqam bo'yicha do'kon topilmadi" });
    }

    const isMatch = await bcrypt.compare(password, store.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Parol xato" });
    }

    const refreshToken = generateRefreshToken({
      id: store._id,
      store_id: store._id,
      role: "ceo",
    });

    const accessToken = generateAccessToken({
      id: store._id,
      store_id: store._id,
      role: "ceo",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth/store/refresh",
    });

    res.status(200).json({
      message: "Hisobga kirish muvaffaqiyatli",
      access_token: accessToken,
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token topilmadi" });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res
        .status(401)
        .json({ message: "Refresh token yaroqsiz yoki muddati tugagan" });
    }

    const store = await Store.findById(decoded.id);
    if (!store) {
      return res.status(404).json({ message: "Do'kon topilmadi" });
    }

    const newAccessToken = generateAccessToken({
      id: store._id,
      store_id: store._id,
      role: "ceo",
    });

    return res.status(200).json({ access_token: newAccessToken });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { profile_picture, store_name, ceo_name } = req.body;
    const store = await Store.findByIdAndUpdate(
      req.user.store_id,
      { profile_picture, store_name, ceo_name },
      { new: true },
    ).select("-password");
    if (!store) {
      return res.status(400).json({ message: "Do'kon topilmadi" });
    }
    res
      .status(200)
      .json({ message: "Do'kon muvaffaqiyatli tahrirlandi", data: store });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const store = await Store.findById(req.user.store_id);
    if (!store) {
      return res.status(400).json({ message: "Do'kon topilmadi" });
    }
    return res.status(200).json(store);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { ceo_phone } = req.body;
    const ceo = await Store.findOne({ ceo_phone });
    if (!ceo) {
      return res
        .status(400)
        .json({ message: "Telefon raqam bo'yicha do'kon topilmadi" });
    }
    const { otp, otp_expires_at } = generateOtp();

    ceo.otp = otp;
    ceo.otp_expires_at = otp_expires_at;

    await ceo.save();

    // const SMS_TEMPLATE = `MARK1 ilovasiga ro‘yxatdan o‘tish uchun tasdiqlash kodingiz: ${otp}. Ushbu kodni hech kimga bermang.`;

    const result = await sendSms(
      ceo_phone,
      null,
      "universal_otp",
      2,
      "MARK1",
      otp,
    );
    if (!result.success) {
      return res
        .status(400)
        .json({ message: `Sms yuborishda xatolik: ${result.error}` });
    }

    return res.status(200).json({
      message: "Parolni tiklash uchun sms kod yuborildi",
      verify_data: { ceo_phone, otp_expires_at },
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { otp, ceo_phone, new_password } = req.body;
    const store = await Store.findOne({ ceo_phone });
    if (!store) {
      return res
        .status(400)
        .json({ message: "Telefon raqam bo'yicha do'kon topilmadi" });
    }

    if (store.otp === null) {
      return res
        .status(400)
        .json({ message: "Do'kon allaqachon tasdiqlangan" });
    }

    if (Date.now() > store.otp_expires_at) {
      return res
        .status(400)
        .json({ message: "Kodning yaroqlilik muddati tugagan" });
    }

    if (store.otp !== otp) {
      return res.status(400).json({ message: "Kod xato" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    store.password = hashedPassword;

    store.otp = null;
    store.otp_expires_at = null;

    await store.save();

    res.status(200).json({
      message: "Parol muvaffaqiyatli o'zgartirildi",
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const { store_id } = req.user;
    const store = await Store.findById(store_id);
    if (!store) {
      return res.status(400).json({ message: "ID bo'yicha do'kon topilmadi" });
    }
    const isMatch = await bcrypt.compare(old_password, store.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Hozirgi parol xato" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    store.password = hashedPassword;

    await store.save();

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/api/auth/store/refresh",
    });

    res.status(200).json({
      message: "Parol muvaffaqiyatli o'zgartirildi",
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

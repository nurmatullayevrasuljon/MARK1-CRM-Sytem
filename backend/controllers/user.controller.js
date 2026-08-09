const { default: mongoose } = require("mongoose");
const User = require("../models/user.model");
const {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/token.util");

exports.createUser = async (req, res) => {
  try {
    const { id } = req.user;
    const { user_name, user_phone, password, role, profile_picture } = req.body;
    const existingUser = await User.findOne({
      store_id: id,
      user_phone,
    });
    if (existingUser) {
      return res.status(400).json({
        message: "Ushbu telefon raqam bilan xodim mavjud",
      });
    }
    // const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      store_id: id,
      user_name,
      user_phone,
      role,
      // password: hashedPassword,
      password,
      profile_picture,
    });
    return res.status(200).json({
      message: "Xodim muvaffaqiyatli yaratildi",
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.user;
    const { user_id } = req.query;
    const { user_name, user_phone, password, role, profile_picture } = req.body;

    const existingUser = await User.findOne({
      store_id: id,
      user_phone,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Ushbu telefon raqam bilan xodim mavjud",
      });
    }

    // const hashedPassword = await bcrypt.hash(password, 10);

    const editingUser = await User.findByIdAndUpdate(user_id, {
      user_name,
      user_phone,
      role,
      // password: hashedPassword,
      password,
      profile_picture,
    });

    if (!editingUser) {
      return res.status(400).json({ message: "Xodim topilmadi" });
    }

    return res.status(200).json({
      message: "Xodim muvaffaqiyatli tahrirlandi",
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { user_id } = req.query;

    const deletingUser = await User.findByIdAndDelete(user_id);
    if (!deletingUser) {
      return res.status(400).json({ message: "Xodim topilmadi" });
    }
    return res.status(200).json({
      message: "Xodim muvaffaqiyatli o'chirildi",
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { id } = req.user;
    const users = await User.find({
      store_id: id,
    });
    return res.status(200).json(users);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { user_id } = req.query;
    const user = await User.findById(user_id);
    return res.status(200).json(user);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.getUserByPhone = async (req, res) => {
  try {
    const { id } = req.user;
    const { user_phone } = req.query;
    const user = await User.findOne({
      store_id: id,
      user_phone,
    });
    return res.status(200).json(user);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.signinUser = async (req, res) => {
  try {
    const { user_phone, password } = req.body;
    const user = await User.findOne({ user_phone });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Telefon raqam bo'yicha xodim topilmadi" });
    }

    // const isMatch = bcrypt.compare(password, user.password);
    const isMatch = password.toString() === user.password;

    if (!isMatch) {
      return res.status(400).json({ message: "Parol mos emas" });
    }

    const refreshToken = generateRefreshToken({
      id: user._id,
      store_id: user.store_id,
      role: user.role,
    });

    const accessToken = generateAccessToken({
      id: user._id,
      store_id: user.store_id,
      role: user.role,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth/user/refresh",
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

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(400).json({ message: "Xodim topilmadi" });
    }
    return res.status(200).json(user);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.refreshUser = async (req, res) => {
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

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "Xodim topilmadi" });
    }

    const newAccessToken = generateAccessToken({
      id: user._id,
      store_id: user.store_id,
      role: user.role,
    });

    return res.status(200).json({ access_token: newAccessToken });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

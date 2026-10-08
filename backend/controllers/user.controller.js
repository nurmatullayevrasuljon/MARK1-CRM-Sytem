const { default: mongoose } = require("mongoose");
const bcrypt = require("bcryptjs");
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

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Parol kamida 6 xonali bo'lishi kerak",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      store_id: id,
      user_name,
      user_phone,
      role,
      password: hashedPassword,
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
      _id: { $ne: user_id },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Ushbu telefon raqam bilan xodim mavjud",
      });
    }

    const updateFields = {
      user_name,
      user_phone,
      role,
      profile_picture,
    };

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          message: "Parol kamida 6 xonali bo'lishi kerak",
        });
      }
      updateFields.password = await bcrypt.hash(password, 10);
    }

    const editingUser = await User.findOneAndUpdate(
      { _id: user_id, store_id: id },
      updateFields,
      { new: true }
    ).select("-password");

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
    const { id } = req.user;
    const { user_id } = req.query;

    const deletingUser = await User.findOneAndDelete({ _id: user_id, store_id: id });
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
    }).select("-password");
    return res.status(200).json(users);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.user;
    const { user_id } = req.query;
    const user = await User.findOne({ _id: user_id, store_id: id }).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Xodim topilmadi" });
    }
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
    }).select("-password");
    return res.status(200).json(user);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.signinUser = async (req, res) => {
  try {
    const { user_phone, password } = req.body;
    const type =
      req.headers["client-platform-type"]?.toLowerCase() === "mobile"
        ? "mobile"
        : "web";

    const user = await User.findOne({ user_phone });
    
    // CF-15 fix: Yagona xato xabari
    if (!user) {
      return res
        .status(400)
        .json({ message: "Telefon raqam yoki parol noto'g'ri" });
    }

    // CF-03 fix: bcrypt taqqoslash + mavjud eski ochiq matn parollarni avtomatik yangilash
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch {
      isMatch = false;
    }
    if (!isMatch && password.toString() === user.password) {
      isMatch = true;
      user.password = await bcrypt.hash(password, 10);
      await user.save();
    }

    if (!isMatch) {
      return res.status(400).json({ message: "Telefon raqam yoki parol noto'g'ri" });
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

    if (type === "web") {
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/api/auth/user/refresh",
      });
    }

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth/user/refresh",
    });

    res.status(200).json({
      message: "Hisobga kirish muvaffaqiyatli",
      access_token: accessToken,
      ...(type === "mobile" && { refresh_token: refreshToken }),

    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
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

exports.logoutUser = async (req, res) => {
  try {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/api/auth/user/refresh",
    });
    return res.status(200).json({ message: "Muvaffaqiyatli chiqildi" });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Avtorizatsiya talab qilinadi" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Bu amalni bajarish uchun ruxsatingiz yo'q",
      });
    }

    next();
  };
};

module.exports = { checkRole };

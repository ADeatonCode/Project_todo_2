const User = require("../models/user");

const requireAuth = async (req, res, next) => {
  const userId = req.header("X-User-Id");
  if (!userId) {
    return res.status(401).send({ message: "Login required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).send({ message: "Login required" });
    }
    if (user.banned) {
      return res.status(403).send({ message: "This account is banned" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).send({ message: "Login required" });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).send({ message: "Admin only" });
  }
  next();
};

module.exports = { requireAuth, requireAdmin };

const User = require("../models/user");
const { isStaff, isHead, isAdminEmail, ensureSingleHead } = require("../utils/admin");

function readBearerToken(req) {
  const header = req.header("Authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

const requireAuth = async (req, res, next) => {
  const token = readBearerToken(req);
  const userId = req.header("X-User-Id");

  try {
    let user = null;
    if (token) {
      user = await User.findOne({ sessionToken: token });
    } else if (userId) {
      // Rollout fallback for clients that have not logged in again yet
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(401).send({ message: "Login required" });
    }
    if (user.banned) {
      return res.status(403).send({ message: "This account is banned" });
    }
    if (isAdminEmail(user.email) && user.role !== "head") {
      await ensureSingleHead(User, user);
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).send({ message: "Login required" });
  }
};

const requireAdmin = (req, res, next) => {
  if (!isStaff(req.user)) {
    return res.status(403).send({ message: "Admin only" });
  }
  next();
};

const requireHead = (req, res, next) => {
  if (!isHead(req.user)) {
    return res.status(403).send({ message: "Head admin only" });
  }
  next();
};

module.exports = { requireAuth, requireAdmin, requireHead };

/*
 * This file is the bouncer for the API.
 * It checks who is logged in before they can see or change data.
 * Extra checks keep admin tools and head-admin tools locked.
 */
const User = require("../models/user");
const { isStaff, isHead, isAdminUser, ensureSingleHead } = require("../utils/admin");

// Pull the login token out of the Authorization header (the "Bearer ..." part).
function readBearerToken(req) {
  const header = req.header("Authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

// Stop the request unless we know who the user is and they are not banned.
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
    // Keep exactly one head admin. If none exist, a known owner can become head.
    const headCount = await User.countDocuments({ role: "head" });
    if (headCount === 0 && isAdminUser(user)) {
      await ensureSingleHead(User, user);
    } else if (headCount > 1) {
      await ensureSingleHead(User, user);
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).send({ message: "Login required" });
  }
};

// Only staff (admin or head) may continue past this check.
const requireAdmin = (req, res, next) => {
  if (!isStaff(req.user)) {
    return res.status(403).send({ message: "Admin only" });
  }
  next();
};

// Only the one head admin may continue past this check.
const requireHead = (req, res, next) => {
  if (!isHead(req.user)) {
    return res.status(403).send({ message: "Head admin only" });
  }
  next();
};

module.exports = { requireAuth, requireAdmin, requireHead };

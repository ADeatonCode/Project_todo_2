function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function isAdminEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const envAdmin = normalizeEmail(process.env.ADMIN_EMAIL);
  return normalized === "acdelgato@gmail.com" || (envAdmin && normalized === envAdmin);
}

function isHead(user) {
  if (!user) return false;
  return user.role === "head" || isAdminEmail(user.email);
}

function isStaff(user) {
  if (!user) return false;
  return user.role === "admin" || user.role === "head" || isHead(user);
}

function publicUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || "user",
    banned: !!user.banned,
  };
}

function authUser(user) {
  if (!user) return null;
  return {
    ...publicUser(user),
    token: user.sessionToken,
  };
}

async function ensureSingleHead(User, user) {
  if (!user) return user;
  let changed = false;

  if (isAdminEmail(user.email)) {
    if (user.role !== "head") {
      user.role = "head";
      changed = true;
    }
    await User.updateMany(
      { _id: { $ne: user._id }, role: "head" },
      { $set: { role: "user" } }
    );
  } else if (user.role === "head") {
    user.role = "user";
    changed = true;
  } else if (!user.role) {
    user.role = "user";
    changed = true;
  }

  if (typeof user.banned !== "boolean") {
    user.banned = false;
    changed = true;
  }

  if (changed) {
    await user.save();
  }
  return user;
}

module.exports = {
  normalizeEmail,
  isAdminEmail,
  isHead,
  isStaff,
  publicUser,
  authUser,
  ensureSingleHead,
};

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
  return user.role === "head";
}

function isStaff(user) {
  if (!user) return false;
  return user.role === "admin" || user.role === "head";
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

function groupNamesFromUser(user) {
  const groups = user?.groups || [];
  return groups
    .map((group) => (typeof group === "string" ? group : group && group.name ? group.name : ""))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function compareAdminUsers(a, b) {
  const aHead = isHead(a);
  const bHead = isHead(b);
  if (aHead !== bHead) return aHead ? -1 : 1;

  const aKey = groupNamesFromUser(a)[0] || "";
  const bKey = groupNamesFromUser(b)[0] || "";
  const aUngrouped = !aKey;
  const bUngrouped = !bKey;
  if (aUngrouped !== bUngrouped) return aUngrouped ? 1 : -1;

  const groupCmp = aKey.localeCompare(bKey, undefined, { sensitivity: "base" });
  if (groupCmp) return groupCmp;

  const aStaff = isStaff(a);
  const bStaff = isStaff(b);
  if (aStaff !== bStaff) return aStaff ? -1 : 1;

  const aName = String(a.name || a.email || "").toLowerCase();
  const bName = String(b.name || b.email || "").toLowerCase();
  const nameCmp = aName.localeCompare(bName, undefined, { sensitivity: "base" });
  if (nameCmp) return nameCmp;
  return String(a.email || "").localeCompare(String(b.email || ""), undefined, { sensitivity: "base" });
}

function sortAdminUsers(users) {
  return [...users].sort(compareAdminUsers);
}

function authUser(user) {
  if (!user) return null;
  return {
    ...publicUser(user),
    token: user.sessionToken,
  };
}

async function demoteExtraHeads(User, keepId) {
  if (!keepId) return;
  await User.updateMany(
    { role: "head", _id: { $ne: keepId } },
    { $set: { role: "admin" } }
  );
}

async function repairHeadUniqueness(User) {
  const heads = await User.find({ role: "head" }).select("_id").sort({ _id: 1 });
  if (heads.length > 1) {
    await demoteExtraHeads(User, heads[0]._id);
  }
  return heads[0] || null;
}

async function ensureSingleHead(User, user) {
  if (!user) return user;
  let changed = false;

  if (!user.role) {
    user.role = "user";
    changed = true;
  }
  if (typeof user.banned !== "boolean") {
    user.banned = false;
    changed = true;
  }

  const heads = await User.find({ role: "head" }).select("_id").sort({ _id: 1 });

  if (heads.length === 0) {
    if (isAdminEmail(user.email)) {
      user.role = "head";
      changed = true;
    }
  } else if (heads.length > 1) {
    const keepId = heads.some((head) => String(head._id) === String(user._id))
      ? user._id
      : heads[0]._id;
    await demoteExtraHeads(User, keepId);
    if (String(user._id) !== String(keepId) && user.role === "head") {
      user.role = "admin";
      changed = true;
    }
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
  groupNamesFromUser,
  compareAdminUsers,
  sortAdminUsers,
  demoteExtraHeads,
  repairHeadUniqueness,
  ensureSingleHead,
};

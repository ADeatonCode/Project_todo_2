function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function normalizeUsername(value) {
  return String(value || "").toLowerCase().trim();
}

function usernameFromEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) return "";
  return normalizeUsername(normalized.split("@")[0]);
}

function identifierToUsername(value) {
  const normalized = normalizeUsername(value);
  if (!normalized) return "";
  if (normalized.includes("@")) return usernameFromEmail(normalized);
  return normalized;
}

function isValidUsername(username) {
  return /^[a-z0-9][a-z0-9._-]{0,39}$/i.test(username);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAdminEmail(value) {
  const normalized = normalizeEmail(value);
  if (!normalized) return false;
  const envAdmin = normalizeEmail(process.env.ADMIN_EMAIL);
  if (normalized === "acdelgato@gmail.com" || (envAdmin && normalized === envAdmin)) {
    return true;
  }
  const asUsername = normalized.includes("@")
    ? usernameFromEmail(normalized)
    : normalizeUsername(normalized);
  if (asUsername === "acdelgato") return true;
  if (envAdmin && asUsername === usernameFromEmail(envAdmin)) return true;
  return false;
}

function isAdminUser(user) {
  if (!user) return false;
  return isAdminEmail(user.email) || isAdminEmail(user.username);
}

async function findUserByLogin(User, identifier) {
  const raw = String(identifier || "").trim();
  const normalized = normalizeEmail(raw);
  if (!normalized) return null;

  const escaped = escapeRegex(normalized);
  const local = normalized.includes("@") ? usernameFromEmail(normalized) : normalized;
  const or = [
    { username: { $regex: new RegExp(`^${escaped}$`, "i") } },
    { email: { $regex: new RegExp(`^${escaped}$`, "i") } },
  ];
  if (local && local !== normalized) {
    or.push({ username: { $regex: new RegExp(`^${escapeRegex(local)}$`, "i") } });
  }
  if (!normalized.includes("@") && local) {
    or.push({ email: { $regex: new RegExp(`^${escapeRegex(local)}@`, "i") } });
  }
  return User.findOne({ $or: or });
}

async function findUserByUsername(User, username) {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;
  return User.findOne({
    username: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
  });
}

async function ensureUsername(User, user) {
  if (!user || user.username) return user;
  const derived = usernameFromEmail(user.email);
  if (!derived) return user;
  const clash = await findUserByUsername(User, derived);
  if (!clash || String(clash._id) === String(user._id)) {
    user.username = derived;
  }
  return user;
}

async function backfillUsernames(User) {
  const users = await User.find({
    $or: [{ username: { $exists: false } }, { username: null }, { username: "" }],
  });
  for (const user of users) {
    const base = usernameFromEmail(user.email);
    if (!base) continue;
    let candidate = base;
    let n = 1;
    while (await User.findOne({
      _id: { $ne: user._id },
      username: candidate,
    })) {
      candidate = `${base}${n}`;
      n += 1;
    }
    user.username = candidate;
    await user.save();
  }
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
    username: user.username,
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

  const aName = String(a.name || a.username || a.email || "").toLowerCase();
  const bName = String(b.name || b.username || b.email || "").toLowerCase();
  const nameCmp = aName.localeCompare(bName, undefined, { sensitivity: "base" });
  if (nameCmp) return nameCmp;
  const aHandle = String(a.username || a.email || "");
  const bHandle = String(b.username || b.email || "");
  return aHandle.localeCompare(bHandle, undefined, { sensitivity: "base" });
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
    if (isAdminUser(user)) {
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
  normalizeUsername,
  usernameFromEmail,
  identifierToUsername,
  isValidUsername,
  escapeRegex,
  isAdminEmail,
  isAdminUser,
  findUserByLogin,
  findUserByUsername,
  ensureUsername,
  backfillUsernames,
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

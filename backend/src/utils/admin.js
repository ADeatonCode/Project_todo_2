function isAdminEmail(email) {
  const normalized = String(email || "").toLowerCase().trim();
  if (!normalized) return false;
  const envAdmin = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  return normalized === "acdelgato@gmail.com" || (envAdmin && normalized === envAdmin);
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

module.exports = { isAdminEmail, publicUser, authUser };

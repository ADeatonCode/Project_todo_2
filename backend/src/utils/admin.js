function isAdminEmail(email) {
  const normalized = String(email || "").toLowerCase().trim();
  if (!normalized) return false;
  const envAdmin = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  return normalized === "acdelgato@gmail.com" || (envAdmin && normalized === envAdmin);
}

function publicUser(user) {
  if (!user) return null;
  const obj = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
}

module.exports = { isAdminEmail, publicUser };

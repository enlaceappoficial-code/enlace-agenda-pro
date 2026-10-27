const bcrypt = require("bcryptjs");

const { prisma } = require("./prisma");
const { getEntitlementsForShop } = require("./plans");

async function login(email, password) {
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, shopId: user.shopId, email: user.email };
}

async function requireAuth(req, res, next) {
  if (!req.session?.adminUserId || !req.session?.shopId) {
    res.status(401).json({ error: "NO_AUTH" });
    return;
  }
  try {
    const shop = await prisma.shop.findUnique({ where: { id: req.session.shopId } });
    req.shop = shop || null;
    req.entitlements = getEntitlementsForShop(shop);
  } catch {
    req.shop = null;
    req.entitlements = getEntitlementsForShop(null);
  }
  next();
}

module.exports = { login, requireAuth };


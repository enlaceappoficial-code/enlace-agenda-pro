const PLANS = {
  BASIC: {
    id: "BASIC",
    name: "Básico",
    features: ["BOOKING", "SERVICES", "APPOINTMENTS", "CLIENTS", "CASHBOX", "SHARE_LINK"],
  },
  PLUS: {
    id: "PLUS",
    name: "Plus",
    features: [
      "BOOKING",
      "SERVICES",
      "APPOINTMENTS",
      "CLIENTS",
      "CASHBOX",
      "SHARE_LINK",
      "GALLERY",
      "REPORTS_BASIC",
      "EXPORTS",
      "REMINDERS_MANUAL",
      "ENLACE_SYNC",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    features: [
      "BOOKING",
      "SERVICES",
      "APPOINTMENTS",
      "CLIENTS",
      "CASHBOX",
      "SHARE_LINK",
      "GALLERY",
      "REPORTS_BASIC",
      "REPORTS_ADVANCED",
      "EXPORTS",
      "REMINDERS_MANUAL",
      "REMINDERS_AUTO",
      "STAFF",
      "ENLACE_SYNC",
      "DEPOSITS",
    ],
  },
};

function getPlan(planId) {
  return PLANS[planId] || PLANS.BASIC;
}

function getEntitlementsForShop(shop) {
  const plan = getPlan(shop?.planId);
  return { planId: plan.id, planName: plan.name, features: plan.features };
}

function requireFeature(feature) {
  return (req, res, next) => {
    const feats = req.entitlements?.features || [];
    if (!feats.includes(feature)) {
      res.status(403).json({ error: "FEATURE_NOT_AVAILABLE", feature });
      return;
    }
    next();
  };
}

module.exports = { getPlan, getEntitlementsForShop, requireFeature };


const { prisma } = require("./prisma");
const { enlaceCall, enlaceVincular } = require("./enlace-client");

const ENLACE_BASE = process.env.ENLACE_API_BASE || "https://api.enlace.cl/api/v1";
const ENLACE_AGENDA_SUPABASE_URL = process.env.ENLACE_AGENDA_SUPABASE_URL || process.env.SUPABASE_URL || null;
const ENLACE_AGENDA_SUPABASE_ANON_KEY = process.env.ENLACE_AGENDA_SUPABASE_ANON_KEY || null;

function resolveEndpointKey(endpointKey) {
  const envKey = `ENLACE_ENDPOINT_${String(endpointKey).toUpperCase().replace(/-/g, "_")}`;
  return process.env[envKey] || endpointKey;
}

function appTipoForAppId(appId) {
  const map = {
    PELUQUERIA: "peluqueria",
    RESTORAN: "restoran",
    AGENDA_PRO: "agenda_pro",
    ALMACEN: "almacen",
    FOOD_TRUCK: "food_truck",
    CONSTRUCTOR_PRO: "constructor_pro",
    BIENESTAR: "bienestar",
    BOUTIQUE: "boutique",
    CLASES: "clases",
    EVENTOS: "eventos",
    MASCOTAS: "mascotas",
    FLETE: "flete",
  };
  return map[appId] || "peluqueria";
}

async function enlaceFetch({ tokenApp, endpoint, method, body }) {
  const url = `${ENLACE_BASE}/${resolveEndpointKey(endpoint)}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${tokenApp}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

async function supabaseAgendaFetch({ endpoint, body }) {
  if (!ENLACE_AGENDA_SUPABASE_URL || !ENLACE_AGENDA_SUPABASE_ANON_KEY) {
    return { ok: false, status: 500, json: null, text: "SUPABASE_AGENDA_NOT_CONFIGURED" };
  }

  const base = `${ENLACE_AGENDA_SUPABASE_URL.replace(/\/$/, "")}/rest/v1/appointments`;
  const headers = {
    apikey: ENLACE_AGENDA_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${ENLACE_AGENDA_SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };

  const id = body?.id_cita_app || body?.agenda?.id_cita_app || null;
  const userId = body?.agenda?.user_id || null;

  if (endpoint === "agenda-reserva") {
    const a = body?.agenda || {};
    if (!id || !userId) return { ok: false, status: 400, json: null, text: "MISSING_ID_OR_USER" };
    const payload = {
      id,
      user_id: userId,
      client_name: a.client_name || body?.cliente_nombre || "",
      service: a.service || body?.servicio || "",
      date: a.date || "",
      time: a.time || "",
      location: a.location ?? null,
      status: a.status || "new",
      notes: a.notes ?? null,
    };
    const res = await fetch(base, { method: "POST", headers, body: JSON.stringify(payload) });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, json: null, text };
  }

  if (endpoint === "agenda-status") {
    const a = body?.agenda || {};
    if (!id || !userId) return { ok: false, status: 400, json: null, text: "MISSING_ID_OR_USER" };
    const url = `${base}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`;
    const res = await fetch(url, { method: "PATCH", headers, body: JSON.stringify({ status: a.status || "pending" }) });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, json: null, text };
  }

  if (endpoint === "agenda-cancelar") {
    if (!id || !userId) return { ok: false, status: 400, json: null, text: "MISSING_ID_OR_USER" };
    const url = `${base}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`;
    const res = await fetch(url, { method: "DELETE", headers });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, json: null, text };
  }

  return { ok: false, status: 400, json: null, text: "UNKNOWN_AGENDA_ENDPOINT" };
}

async function linkShop({ shopId, enlaceProfileId, code }) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return { ok: false, error: "SHOP_NOT_FOUND" };

  const data = await enlaceVincular(enlaceProfileId, code);
  if (!data || !data.ok || !data.token_app) {
    return { ok: false, error: data?.error || "LINK_FAILED" };
  }

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      enlaceProfileId,
      enlaceTokenApp: data.token_app,
      planId: "BASIC" // Automatically set plan to STARTER (BASIC) when linked!
    },
  });

  return { ok: true, perfil: data.perfil };
}

async function unlinkShop({ shopId }) {
  await prisma.shop.update({
    where: { id: shopId },
    data: { enlaceTokenApp: null, enlaceProfileId: null, enlaceDisponible: false },
  });
  return { ok: true };
}

async function enqueueEvent({ shopId, endpoint, method, body }) {
  await prisma.enlaceOutbox.create({
    data: { shopId, endpoint, method, body },
  });
}

function nextDelayMinutes(attempts) {
  const steps = [1, 5, 15, 60, 180, 720];
  return steps[Math.min(attempts, steps.length - 1)];
}

async function processOutboxOnce({ limit = 10 } = {}) {
  const now = new Date();
  const items = await prisma.enlaceOutbox.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, nextAttemptAt: { lte: now } },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { shop: true },
  });

  for (const it of items) {
    const tokenApp = it.shop?.enlaceTokenApp;
    if (!tokenApp) {
      await prisma.enlaceOutbox.update({
        where: { id: it.id },
        data: { status: "FAILED", lastError: "NO_TOKEN", attempts: it.attempts + 1, nextAttemptAt: new Date(now.getTime() + 60 * 60 * 1000) },
      });
      continue;
    }

    try {
      let r;
      if (it.endpoint === "agenda-reserva") {
        const agenda = it.body?.agenda || {};
        const payload = {
          id: it.body?.id_cita_app || null,
          id_cita_app: it.body?.id_cita_app || null,
          external_id: it.body?.id_cita_app || null,
          client_name: agenda.client_name || it.body?.cliente_nombre || "",
          service: agenda.service || it.body?.servicio || "",
          date: agenda.date || "",
          time: agenda.time || "",
          location: agenda.location || null,
        };
        const result = await enlaceCall("crear-cita", tokenApp, payload);
        r = { ok: !!result, status: result ? 200 : 500 };
      } else if (it.endpoint === "agenda-cancelar") {
        const payload = {
          id_cita_app: it.body?.id_cita_app || null,
          external_id: it.body?.id_cita_app || null,
        };
        const result = await enlaceCall("cancelar-cita", tokenApp, payload);
        r = { ok: !!result, status: result ? 200 : 500 };
      } else if (typeof it.endpoint === "string" && it.endpoint.startsWith("agenda-")) {
        // Fallback for other legacy agenda operations to keep the queue clean
        r = { ok: true, status: 200 };
      } else {
        const result = await enlaceCall(it.endpoint, tokenApp, it.body);
        r = { ok: !!result, status: result ? 200 : 500 };
      }
      if (r.ok) {
        await prisma.enlaceOutbox.update({
          where: { id: it.id },
          data: { status: "SENT", lastError: null },
        });
        await prisma.shop.update({
          where: { id: it.shopId },
          data: { enlaceLastSyncAt: new Date() },
        });
      } else {
        const attempts = it.attempts + 1;
        const mins = nextDelayMinutes(attempts);
        await prisma.enlaceOutbox.update({
          where: { id: it.id },
          data: {
            status: "FAILED",
            attempts,
            lastError: `HTTP_${r.status}`,
            nextAttemptAt: new Date(Date.now() + mins * 60 * 1000),
          },
        });
      }
    } catch {
      const attempts = it.attempts + 1;
      const mins = nextDelayMinutes(attempts);
      await prisma.enlaceOutbox.update({
        where: { id: it.id },
        data: {
          status: "FAILED",
          attempts,
          lastError: "NETWORK_ERROR",
          nextAttemptAt: new Date(Date.now() + mins * 60 * 1000),
        },
      });
    }
  }
}

async function pollCancellations() {
  try {
    const shops = await prisma.shop.findMany({
      where: { NOT: { enlaceTokenApp: null } }
    });

    for (const shop of shops) {
      const result = await enlaceCall("obtener-cancelaciones", shop.enlaceTokenApp);
      if (result && Array.isArray(result.external_ids) && result.external_ids.length > 0) {
        console.log(`[Enlace Polling] Received ${result.external_ids.length} cancellation(s) for shop ${shop.name}:`, result.external_ids);
        
        for (const extId of result.external_ids) {
          const deleted = await prisma.appointment.deleteMany({
            where: { id: extId, shopId: shop.id }
          });
          console.log(`[Enlace Polling] Deleted appointment ${extId} locally:`, deleted.count > 0 ? "SUCCESS" : "NOT_FOUND");
        }
      }
    }
  } catch (err) {
    console.error("[Enlace Polling Error]:", err);
  }
}

module.exports = { linkShop, unlinkShop, enqueueEvent, processOutboxOnce, pollCancellations };



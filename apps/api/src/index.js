require('dotenv').config()

const cookieSession = require("cookie-session");
const cors = require("cors");
const express = require("express");
const path = require("path");
const fs = require("fs");
const { z } = require("zod");

const { prisma } = require("./prisma");
const { login, requireAuth } = require("./auth");
const { getSlots } = require("./availability");
const { dateAtTime, minutesFromHHmm } = require("./time");
const { getEntitlementsForShop, requireFeature } = require("./plans");
const { enqueueEvent, linkShop, processOutboxOnce, unlinkShop, pollCancellations } = require("./enlace");
const { enlaceVincular } = require("./enlace-client");

const app = express();
app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));

const corsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin || origin === 'null') return cb(null, true);
    if (corsOrigins.length === 0) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-master-secret"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(
  cookieSession({
    name: "barber_session",
    secret: process.env.SESSION_SECRET || "dev-session-secret",
    httpOnly: true,
    sameSite: process.env.COOKIE_SAMESITE || "lax",
    secure: process.env.NODE_ENV === "production",
  }),
);

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function appointmentWhereVisible() {
  return { status: { notIn: ["CANCELED", "NO_SHOW"] } };
}

app.get(
  "/health",
  asyncHandler(async (_req, res) => {
    res.json({ ok: true });
  }),
);

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const body = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .parse(req.body);
    const user = await login(body.email, body.password);
    if (!user) {
      res.status(401).json({ error: "INVALID_CREDENTIALS" });
      return;
    }
    req.session.adminUserId = user.id;
    req.session.shopId = user.shopId;
    res.json({ ok: true, user: { email: user.email } });
  }),
);

app.post(
  "/api/auth/register",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        shopName: z.string().min(2),
        slug: z.string().min(2),
        businessType: z.string().optional().default('general')
      })
      .parse(req.body);
    
    const existingUser = await prisma.adminUser.findUnique({ where: { email: body.email } });
    if (existingUser) return res.status(400).json({ error: "EMAIL_EXISTS" });

    const existingShop = await prisma.shop.findUnique({ where: { slug: body.slug } });
    if (existingShop) return res.status(400).json({ error: "SLUG_EXISTS" });

    const passwordHash = await require("bcryptjs").hash(body.password, 10);
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días de prueba

    const shop = await prisma.shop.create({
      data: {
        name: body.shopName,
        slug: body.slug,
        appId: "AGENDA_PRO",
        businessType: body.businessType || "general",
        planId: "PRO", // Comienzan con prueba de PRO
        subscriptionEndsAt: trialEndsAt,
      }
    });

    const user = await prisma.adminUser.create({
      data: {
        email: body.email,
        passwordHash,
        shopId: shop.id
      }
    });

    // Precargar servicios de ejemplo con las 3 modalidades principales (Presencial, Online, Encargo)
    const sampleServices = [
      {
        shopId: shop.id,
        name: "Atención Presencial / Primera Sesión",
        category: "Presencial",
        durationMin: 45,
        price: 25000,
        modality: "PRESENCIAL",
        instructions: "Te esperamos en nuestras instalaciones. Llega con 5 minutos de anticipación.",
        description: "Sesión personalizada de atención presencial o en terreno."
      },
      {
        shopId: shop.id,
        name: "Asesoría o Sesión Online (Meet / Zoom)",
        category: "Online",
        durationMin: 45,
        price: 20000,
        modality: "ONLINE",
        instructions: "El enlace de videollamada te llegará a tu WhatsApp 15 minutos antes de la hora.",
        description: "Reunión virtual remota para consultas, clases o asesorías."
      },
      {
        shopId: shop.id,
        name: "Pedido Personalizado por Encargo (Ej: Timbre o Producto)",
        category: "Encargos",
        durationMin: 15,
        price: 14990,
        modality: "ENCARGO",
        instructions: "Indica en las notas el texto exacto, especificaciones y color. Retiro en 24 a 48 hrs.",
        description: "Fabricación o preparación de encargo personalizado con retiro coordinado."
      }
    ];

    await prisma.service.createMany({
      data: sampleServices
    });

    req.session.adminUserId = user.id;
    req.session.shopId = shop.id;
    res.json({ ok: true, user: { email: user.email }, shop });
  })
);

app.post("/api/auth/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

// ==========================================
// MASTER BACKOFFICE ENDPOINTS
// ==========================================
app.post(
  "/api/master/codes/generate",
  asyncHandler(async (req, res) => {
    // Protección simple para que solo el backoffice lo consuma
    const secret = req.headers["x-master-secret"];
    if (secret !== (process.env.MASTER_SECRET || "enlace-master-key-123")) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const body = z.object({
      planId: z.enum(["BASIC", "PLUS", "PRO"]),
      appId: z.enum([
        "PELUQUERIA", "RESTORAN", "AGENDA_PRO", "ALMACEN", 
        "FOOD_TRUCK", "CONSTRUCTOR_PRO", "BIENESTAR", "BOUTIQUE", 
        "CLASES", "EVENTOS", "MASCOTAS", "FLETE"
      ]).default("PELUQUERIA"),
      rutClient: z.string().optional(),
      clientName: z.string().optional(),
      clientPhone: z.string().optional(),
      clientEmail: z.string().optional(),
      clientCity: z.string().optional(),
      durationMonths: z.number().int().positive(),
      maxUses: z.number().int().positive().default(1),
    }).parse(req.body);

    // Generar código aleatorio (Ej: ENL-B-A1B2C)
    const crypto = require("crypto");
    const randomStr = crypto.randomBytes(3).toString("hex").toUpperCase();
    const prefix = body.appId === "PELUQUERIA" ? "B" : (body.appId === "RESTORAN" ? "R" : "A");
    const codeString = `ENL-${prefix}-${randomStr}`;

    const accessCode = await prisma.accessCode.create({
      data: {
        code: codeString,
        planId: body.planId,
        appId: body.appId,
        rutClient: body.rutClient,
        clientName: body.clientName,
        clientPhone: body.clientPhone,
        clientEmail: body.clientEmail,
        clientCity: body.clientCity,
        durationMonths: body.durationMonths,
        maxUses: body.maxUses,
      }
    });

    res.json({ ok: true, code: accessCode });
  })
);

app.get(
  "/api/master/codes",
  asyncHandler(async (req, res) => {
    const secret = req.headers["x-master-secret"];
    if (secret !== (process.env.MASTER_SECRET || "enlace-master-key-123")) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const codes = await prisma.accessCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ codes });
  })
);

app.get(
  "/api/me",
  asyncHandler(async (req, res) => {
    if (!req.session?.adminUserId) {
      res.json({ user: null });
      return;
    }
    const user = await prisma.adminUser.findUnique({
      where: { id: req.session.adminUserId },
      select: { email: true },
    });
    res.json({ user: user || null });
  }),
);

app.get(
  "/api/shop",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ shop: req.shop, entitlements: req.entitlements });
  }),
);

app.get(
  "/api/services",
  requireAuth,
  asyncHandler(async (req, res) => {
    const services = await prisma.service.findMany({
      where: { shopId: req.session.shopId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    res.json({ services });
  }),
);

app.post(
  "/api/shop/apply-code",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z.object({ code: z.string().min(1) }).parse(req.body);
    
    const accessCode = await prisma.accessCode.findUnique({
      where: { code: body.code }
    });
    
    if (!accessCode) {
      return res.status(404).json({ error: "CODE_NOT_FOUND" });
    }
    
    if (accessCode.usedCount >= accessCode.maxUses) {
      return res.status(400).json({ error: "CODE_EXPIRED" });
    }
    
    const now = new Date();
    const endsAt = new Date(now.setMonth(now.getMonth() + accessCode.durationMonths));
    
    await prisma.$transaction([
      prisma.shop.update({
        where: { id: req.session.shopId },
        data: {
          planId: accessCode.planId,
          subscriptionEndsAt: endsAt,
        }
      }),
      prisma.accessCode.update({
        where: { id: accessCode.id },
        data: { usedCount: { increment: 1 } }
      })
    ]);
    
    res.json({ ok: true, planId: accessCode.planId, endsAt });
  })
);

app.post(
  "/api/services",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        category: z.string().min(1),
        durationMin: z.number().int().min(5).max(8 * 60),
        price: z.number().int().min(0),
        description: z.string().optional(),
        active: z.boolean().optional(),
        modality: z.string().optional(),
        instructions: z.string().nullable().optional(),
        costMaterials: z.number().min(0).optional(),
        costEquipment: z.number().min(0).optional(),
        depositRequired: z.boolean().optional(),
        depositAmount: z.number().int().min(0).optional(),
      })
      .parse(req.body);

    if (body.costMaterials !== undefined || body.costEquipment !== undefined) {
      body.costTotal = (body.costMaterials || 0) + (body.costEquipment || 0);
    }

    const service = await prisma.service.create({
      data: {
        shopId: req.session.shopId,
        name: body.name,
        category: body.category,
        durationMin: body.durationMin,
        price: body.price,
        description: body.description || null,
        active: body.active ?? true,
        modality: body.modality || "PRESENCIAL",
        instructions: body.instructions || null,
        costMaterials: body.costMaterials || 0,
        costEquipment: body.costEquipment || 0,
        costTotal: body.costTotal || 0,
        depositRequired: body.depositRequired ?? false,
        depositAmount: body.depositAmount || 0,
      },
    });

    const shop = req.shop;
    if (shop?.enlaceTokenApp && (req.entitlements?.features || []).includes("ENLACE_SYNC")) {
      await enqueueEvent({
        shopId: shop.id,
        endpoint: "catalogo",
        method: "PUT",
        body: {
          items: await prisma.service
            .findMany({ where: { shopId: shop.id, active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] })
            .then((ss) => ss.map((s) => ({ id: s.id, nombre: s.name, descripcion: s.description || "", precio: s.price, disponible: true }))),
        },
      });
    }

    res.json({ service });
  }),
);

app.patch(
  "/api/services/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        durationMin: z.number().int().min(5).max(8 * 60).optional(),
        price: z.number().int().min(0).optional(),
        description: z.string().nullable().optional(),
        active: z.boolean().optional(),
        modality: z.string().optional(),
        instructions: z.string().nullable().optional(),
        costMaterials: z.number().min(0).optional(),
        costEquipment: z.number().min(0).optional(),
        depositRequired: z.boolean().optional(),
        depositAmount: z.number().int().min(0).optional(),
      })
      .parse(req.body);

    if (body.costMaterials !== undefined || body.costEquipment !== undefined) {
      body.costTotal = (body.costMaterials || 0) + (body.costEquipment || 0);
    }

    const service = await prisma.service.update({
      where: { id: req.params.id, shopId: req.session.shopId },
      data: body,
    });

    const shop = req.shop;
    if (shop?.enlaceTokenApp && (req.entitlements?.features || []).includes("ENLACE_SYNC")) {
      await enqueueEvent({
        shopId: shop.id,
        endpoint: "catalogo",
        method: "PUT",
        body: {
          items: await prisma.service
            .findMany({ where: { shopId: shop.id, active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] })
            .then((ss) => ss.map((s) => ({ id: s.id, nombre: s.name, descripcion: s.description || "", precio: s.price, disponible: true }))),
        },
      });
    }

    res.json({ service });
  }),
);

app.get(
  "/api/gallery",
  requireAuth,
  requireFeature("GALLERY"),
  asyncHandler(async (req, res) => {
    const items = await prisma.galleryItem.findMany({
      where: { shopId: req.session.shopId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  }),
);

app.post(
  "/api/gallery",
  requireAuth,
  requireFeature("GALLERY"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        description: z.string().min(1).max(500),
        category: z.string().min(1).max(60).optional(),
        photos: z.array(z.string().url()).min(1).max(8),
      })
      .parse(req.body);

    const item = await prisma.galleryItem.create({
      data: {
        shopId: req.session.shopId,
        description: body.description,
        category: body.category || null,
        photos: body.photos,
      },
    });

    const shop = req.shop;
    if (shop?.enlaceTokenApp && (req.entitlements?.features || []).includes("ENLACE_SYNC")) {
      await enqueueEvent({
        shopId: shop.id,
        endpoint: "publicar-foto",
        method: "POST",
        body: {
          fotos: body.photos,
          descripcion: body.description,
          categoria: body.category || "trabajos",
        },
      });
    }

    res.json({ item });
  }),
);

app.delete(
  "/api/gallery/:id",
  requireAuth,
  requireFeature("GALLERY"),
  asyncHandler(async (req, res) => {
    await prisma.galleryItem.delete({
      where: { id: req.params.id, shopId: req.session.shopId },
    });
    res.json({ ok: true });
  }),
);

app.get(
  "/api/appointments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const dateISO = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .parse(req.query.date);

    const start = new Date(`${dateISO}T00:00:00`);
    const end = new Date(`${dateISO}T23:59:59`);

    const appointments = await prisma.appointment.findMany({
      where: {
        shopId: req.session.shopId,
        startsAt: { gte: start, lte: end },
      },
      orderBy: { startsAt: "asc" },
      include: { service: true, client: true },
    });
    res.json({ appointments });
  }),
);

app.get(
  "/api/appointments/upcoming",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 3;
    const appointments = await prisma.appointment.findMany({
      where: {
        shopId: req.session.shopId,
        startsAt: { gte: new Date() },
        status: { notIn: ["CANCELED", "NO_SHOW"] }
      },
      orderBy: { startsAt: "asc" },
      take: limit,
      include: { service: true, client: true },
    });
    res.json({ appointments });
  })
);

app.patch("/api/appointments/:id", requireAuth, asyncHandler(async (req, res) => {
  const body = z.object({
    serviceId: z.string().min(1).optional(),
    clientId: z.string().nullable().optional(),
    guestName: z.string().nullable().optional(),
    guestPhone: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    price: z.number().optional(),
    startsAt: z.string().optional(), // Should be ISO or similar
    date: z.string().optional(),
    time: z.string().optional(),
    professionalId: z.string().nullable().optional(),
    depositPaid: z.boolean().optional(),
  }).parse(req.body);

  const existing = await prisma.appointment.findUnique({
    where: { id: req.params.id, shopId: req.session.shopId },
  });
  if (!existing) return res.status(404).json({ error: "NOT_FOUND" });

  let startsAt = existing.startsAt;
  let serviceId = body.serviceId || existing.serviceId;
  let professionalId = body.professionalId === undefined ? existing.professionalId : body.professionalId;

  if (body.date || body.time) {
    const d = body.date || existing.startsAt.toISOString().slice(0, 10);
    const t = body.time || existing.startsAt.toTimeString().slice(0, 5);
    startsAt = dateAtTime(d, t);
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60 * 1000);

  // Check conflicts
  const conflict = await prisma.appointment.findFirst({
    where: {
      id: { not: req.params.id },
      shopId: req.session.shopId,
      professionalId: professionalId,
      ...appointmentWhereVisible(),
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (conflict) throw Object.assign(new Error("SLOT_TAKEN"), { code: "SLOT_TAKEN" });

  const updated = await prisma.appointment.update({
    where: { id: req.params.id },
    data: {
      serviceId,
      clientId: body.clientId,
      guestName: body.guestName,
      guestPhone: body.guestPhone,
      notes: body.notes,
      price: body.price,
      startsAt,
      endsAt,
      professionalId,
      depositPaid: body.depositPaid,
    }
  });

  res.json({ appointment: updated });
}));

app.patch("/api/appointments/:id/status", requireAuth, asyncHandler(async (req, res) => {
  const body = z
    .object({
      status: z.enum([
        "PENDING",
        "CONFIRMED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELED",
        "NO_SHOW",
      ]),
    })
    .parse(req.body);

  const appointment = await prisma.appointment.update({
    where: { id: req.params.id, shopId: req.session.shopId },
    data: { status: body.status },
  });

  if (body.status === "CANCELED") {
    const shop = req.shop;
    if (shop?.enlaceTokenApp && (req.entitlements?.features || []).includes("ENLACE_SYNC")) {
      await enqueueEvent({
        shopId: shop.id,
        endpoint: "agenda-cancelar",
        method: "POST",
        body: {
          id_cita_app: appointment.id,
          estado: "CANCELED",
          agenda: { user_id: shop.enlaceProfileId || null, id_cita_app: appointment.id, op: "delete" },
        },
      });
    }
  }

  if (["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(body.status)) {
    const shop = req.shop;
    if (shop?.enlaceTokenApp && (req.entitlements?.features || []).includes("ENLACE_SYNC")) {
      await enqueueEvent({
        shopId: shop.id,
        endpoint: "agenda-status",
        method: "POST",
        body: {
          id_cita_app: appointment.id,
          estado: body.status,
          agenda: { user_id: shop.enlaceProfileId || null, id_cita_app: appointment.id, status: "pending" },
        },
      });
    }
  }

  if (body.status === "COMPLETED") {
    const shop = req.shop;
    const service = await prisma.service.findUnique({ where: { id: appointment.serviceId } });
    if (shop?.enlaceTokenApp && service && (req.entitlements?.features || []).includes("ENLACE_SYNC")) {
      await enqueueEvent({
        shopId: shop.id,
        endpoint: "agenda-status",
        method: "POST",
        body: {
          id_cita_app: appointment.id,
          estado: "COMPLETED",
          agenda: { user_id: shop.enlaceProfileId || null, id_cita_app: appointment.id, status: "completed" },
        },
      });
      await enqueueEvent({
        shopId: shop.id,
        endpoint: "trabajo-completado",
        method: "POST",
        body: {
          cliente_telefono: appointment.guestPhone || "",
          servicio: service.name,
          solicitar_resena: true,
        },
      });
    }
  }

  res.json({ appointment });
}),
);

// ── Enlace Integration Endpoints ────────────────────────────────
app.get(
  "/api/enlace/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const shop = await prisma.shop.findUnique({ where: { id: req.session.shopId } })
    if (!shop) {
      return res.status(401).json({ error: "SHOP_NOT_FOUND" });
    }
    const pending = await prisma.enlaceOutbox.count({
      where: { shopId: req.session.shopId, status: { in: ["PENDING", "FAILED"] } },
    });
    res.json({
      connected: !!shop.enlaceTokenApp,
      enlaceProfileId: shop.enlaceProfileId || null,
      disponible: shop.enlaceDisponible || false,
      msg: shop.enlaceMsg || "Disponible ahora",
      queue: pending,
      lastSyncAt: shop.enlaceLastSyncAt || null,
    });
  }),
);

app.post(
  "/api/enlace/link",
  requireAuth,
  asyncHandler(async (req, res) => {
    console.log('[enlace/link] body recibido:', req.body)
    console.log('[enlace/link] session:', req.session)
    
    let telefono, codigoFinal
    
    try {
      const parsed = z.object({
        telefono: z.string().min(1),
        code: z.string().optional(),
        codigo: z.string().optional(),
      }).parse(req.body)
      
      telefono = parsed.telefono
      codigoFinal = parsed.code || parsed.codigo
      
      console.log('[enlace/link] parsed OK:', { telefono, codigoFinal })
    } catch (zodErr) {
      console.log('[enlace/link] ZOD ERROR:', zodErr.errors)
      res.status(400).json({ error: 'ZOD_ERROR', detalle: zodErr.errors })
      return
    }

    if (!codigoFinal) {
      res.status(400).json({ error: 'CODIGO_FALTANTE' })
      return
    }

    console.log('[enlace/link] llamando enlaceVincular...')
    const resultado = await enlaceVincular(telefono, codigoFinal)
    console.log('[enlace/link] resultado:', resultado)

    if (!resultado || !resultado.ok) {
      res.status(400).json({ 
        error: resultado?.error || 'VINCULACION_FALLIDA',
        detalle: resultado?.detalle || ''
      })
      return
    }

    await prisma.shop.update({
      where: { id: req.session.shopId },
      data: {
        enlaceProfileId: resultado.perfil?.id || '',
        enlaceTokenApp: resultado.token_app,
        enlaceDisponible: false,
      },
    })

    res.json({ ok: true, perfil: resultado.perfil })
  }),
);

app.post(
  "/api/enlace/unlink",
  requireAuth,
  asyncHandler(async (req, res) => {
    await unlinkShop({ shopId: req.session.shopId });
    res.json({ ok: true });
  }),
);

app.post(
  "/api/enlace/toggle",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        disponible: z.boolean(),
        msg: z.string().min(1).max(80).optional(),
      })
      .parse(req.body);

    const msg = body.msg || "Disponible ahora"

    const shop = await prisma.shop.update({
      where: { id: req.session.shopId },
      data: { enlaceDisponible: body.disponible, enlaceMsg: msg },
    });

    if (shop.enlaceTokenApp) {
      await enqueueEvent({
        shopId: shop.id,
        endpoint: "disponibilidad",
        method: "POST",
        body: { disponible: body.disponible, estado_texto: msg },
      });
    }

    res.json({ ok: true });
  }),
);

app.post(
  "/api/enlace/publish-photo",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        photos: z.array(z.string()),
        description: z.string().max(500).optional(),
        title: z.string().max(100).optional().nullable(),
        location: z.string().max(100).optional().nullable(),
        price: z.number().optional().nullable(),
        onlyGallery: z.boolean().optional().nullable(),
      })
      .parse(req.body);

    const shop = req.shop;
    if (shop?.enlaceTokenApp) {
      await enqueueEvent({
        shopId: shop.id,
        endpoint: "publicar-foto",
        method: "POST",
        body: {
          fotos: body.photos,
          descripcion: body.description || "",
          categoria: "trabajos",
          titulo: body.title || null,
          ubicacion: body.location || null,
          precio: body.price || null,
          solo_galeria: body.onlyGallery ?? false,
        },
      });
    }

    // Guardar también en la galería local para que el barbero vea sus publicaciones en la app
    await prisma.galleryItem.create({
      data: {
        shopId: shop.id,
        description: body.description || body.title || "Publicación de Red Social",
        category: "Red Social",
        photos: body.photos,
      },
    });

    res.json({ ok: true });
  }),
);

app.post(
  "/api/enlace/sync-catalog",
  requireAuth,
  asyncHandler(async (req, res) => {
    const shop = await prisma.shop.findUnique({ where: { id: req.session.shopId } });
    if (!shop?.enlaceTokenApp) {
      res.status(400).json({ error: "NOT_CONNECTED" });
      return;
    }
    const services = await prisma.service.findMany({
      where: { shopId: req.session.shopId, active: true }
    })
    const items = services.map(s => ({
      id: s.id,
      nombre: s.name,
      descripcion: s.description || "",
      precio: s.price,
      disponible: true
    }))

    await enqueueEvent({ shopId: shop.id, endpoint: "catalogo", method: "PUT", body: { items } });
    res.json({ ok: true });
  }),
);

app.get(
  "/public/shops/:slug",
  asyncHandler(async (req, res) => {
    const shop = await prisma.shop.findUnique({
      where: { slug: req.params.slug },
      select: {
        name: true,
        slug: true,
        phone: true,
        city: true,
        timezone: true,
        slotMinutes: true,
        openTime: true,
        closeTime: true,
        breakStart: true,
        breakEnd: true,
        activeDays: true,
        cancellationPolicy: true,
        logoUrl: true,
        depositEnabled: true,
        prepaymentEnabled: true,
        fastPaymentEnabled: true,
        barberBankName: true,
        barberBankAccountType: true,
        barberBankAccountNumber: true,
        barberBankRut: true,
        barberBankOwnerName: true,
        barberBankEmail: true,
      },
    });
    if (!shop) {
      res.status(404).json({ error: "SHOP_NOT_FOUND" });
      return;
    }
    res.json({ shop });
  }),
);

app.get(
  "/public/shops/:slug/services",
  asyncHandler(async (req, res) => {
    const shop = await prisma.shop.findUnique({
      where: { slug: req.params.slug },
      select: { id: true },
    });
    if (!shop) {
      res.status(404).json({ error: "SHOP_NOT_FOUND" });
      return;
    }
    const services = await prisma.service.findMany({
      where: { shopId: shop.id, active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    res.json({ services });
  }),
);

app.get(
  "/public/shops/:slug/availability",
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        serviceId: z.string().min(1),
      })
      .parse(req.query);

    const shop = await prisma.shop.findUnique({
      where: { slug: req.params.slug },
      include: { services: { where: { id: q.serviceId } } },
    });
    if (!shop) {
      res.status(404).json({ error: "SHOP_NOT_FOUND" });
      return;
    }
    const service = shop.services[0];
    if (!service) {
      res.status(404).json({ error: "SERVICE_NOT_FOUND" });
      return;
    }

    const day = new Date(`${q.date}T12:00:00`).getDay();
    const activeDays = Array.isArray(shop.activeDays) ? shop.activeDays : [];
    if (!activeDays.includes(day)) {
      res.json({ slots: [] });
      return;
    }

    const startAt = new Date(`${q.date}T00:00:00`);
    const endAt = new Date(`${q.date}T23:59:59`);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        shopId: shop.id,
        startsAt: { gte: startAt, lte: endAt },
        ...appointmentWhereVisible(),
      },
      select: { startsAt: true, endsAt: true },
    });

    const blocked = await prisma.blockedSlot.findMany({
      where: { shopId: shop.id, date: q.date }
    });

    const blockedAsAppointments = blocked.map(b => ({
      startsAt: dateAtTime(b.date, b.startTime),
      endsAt: dateAtTime(b.date, b.endTime),
    }));

    const existing = [...existingAppointments, ...blockedAsAppointments];

    const slots = getSlots({
      dateISO: q.date,
      serviceDurationMin: service.durationMin,
      slotMinutes: shop.slotMinutes,
      openTime: shop.openTime,
      closeTime: shop.closeTime,
      breakStart: shop.breakStart,
      breakEnd: shop.breakEnd,
      existing,
    });

    res.json({ slots });
  }),
);

app.post(
  "/public/shops/:slug/appointments",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        serviceId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        name: z.string().min(2),
        phone: z.string().min(6),
        email: z.string().email().or(z.literal("")).optional(),
        notes: z.string().optional(),
        depositReceiptUrl: z.string().nullable().optional(),
      })
      .parse(req.body);

    const shop = await prisma.shop.findUnique({
      where: { slug: req.params.slug },
    });
    if (!shop) {
      res.status(404).json({ error: "SHOP_NOT_FOUND" });
      return;
    }

    const service = await prisma.service.findFirst({
      where: { id: body.serviceId, shopId: shop.id, active: true },
    });
    if (!service) {
      res.status(404).json({ error: "SERVICE_NOT_FOUND" });
      return;
    }

    const day = new Date(`${body.date}T12:00:00`).getDay();
    const activeDays = Array.isArray(shop.activeDays) ? shop.activeDays : [];
    if (!activeDays.includes(day)) {
      res.status(400).json({ error: "DAY_NOT_AVAILABLE" });
      return;
    }

    const startM = minutesFromHHmm(body.time);
    const openM = minutesFromHHmm(shop.openTime);
    const closeM = minutesFromHHmm(shop.closeTime);
    if (startM < openM || startM + service.durationMin > closeM) {
      res.status(400).json({ error: "TIME_OUT_OF_RANGE" });
      return;
    }

    if (shop.breakStart && shop.breakEnd) {
      const brStartM = minutesFromHHmm(shop.breakStart);
      const brEndM = minutesFromHHmm(shop.breakEnd);
      const overlapsBreak = startM < brEndM && brStartM < startM + service.durationMin;
      if (overlapsBreak) {
        res.status(400).json({ error: "TIME_IN_BREAK" });
        return;
      }
    }

    const startsAt = dateAtTime(body.date, body.time);
    const endsAt = new Date(startsAt.getTime() + service.durationMin * 60 * 1000);

    const appointment = await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          shopId: shop.id,
          ...appointmentWhereVisible(),
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      });
      if (conflict) {
        const err = new Error("SLOT_TAKEN");
        err.code = "SLOT_TAKEN";
        throw err;
      }

      return tx.appointment.create({
        data: {
          shopId: shop.id,
          serviceId: service.id,
          guestName: body.name,
          guestPhone: body.phone,
          guestEmail: body.email || null,
          notes: body.notes || null,
          startsAt,
          endsAt,
          price: service.price,
          status: "PENDING",
          depositReceiptUrl: body.depositReceiptUrl || null,
          depositPaid: !!body.depositReceiptUrl,
        },
      });
    });

    const ent = getEntitlementsForShop(shop);
    if ((ent.features || []).includes("ENLACE_SYNC") && shop.enlaceTokenApp) {
      await enqueueEvent({
        shopId: shop.id,
        endpoint: "agenda-reserva",
        method: "POST",
        body: {
          id_cita_app: appointment.id,
          estado: "PENDING",
          inicio: startsAt.toISOString(),
          fin: endsAt.toISOString(),
          servicio: service.name,
          cliente_nombre: body.name,
          cliente_telefono: body.phone,
          agenda: {
            user_id: shop.enlaceProfileId || null,
            client_name: body.name,
            service: service.name,
            date: body.date,
            time: body.time,
            location: null,
            status: "new",
            notes: body.notes || null,
          },
        },
      });
    }

    res.json({ appointmentId: appointment.id });
  }),
);

app.get(
  "/public/shops/:slug/appointments/:id",
  asyncHandler(async (req, res) => {
    const shop = await prisma.shop.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, name: true, phone: true, slug: true, cancellationPolicy: true },
    });
    if (!shop) {
      res.status(404).json({ error: "SHOP_NOT_FOUND" });
      return;
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, shopId: shop.id },
      include: { service: true },
    });
    if (!appointment) {
      res.status(404).json({ error: "APPOINTMENT_NOT_FOUND" });
      return;
    }

    res.json({
      shop,
      appointment: {
        id: appointment.id,
        status: appointment.status,
        date: appointment.startsAt.toISOString().slice(0, 10),
        time: appointment.startsAt.toTimeString().slice(0, 5),
        price: appointment.price,
        notes: appointment.notes,
        service: {
          id: appointment.service.id,
          name: appointment.service.name,
          durationMin: appointment.service.durationMin,
          modality: appointment.service.modality || 'PRESENCIAL',
          instructions: appointment.service.instructions || null,
        },
        guestName: appointment.guestName,
      },
    });
  }),
);

app.post(
  "/public/shops/:slug/appointments/:id/cancel",
  asyncHandler(async (req, res) => {
    const body = z.object({ phone: z.string().min(6) }).parse(req.body);

    const shop = await prisma.shop.findUnique({
      where: { slug: req.params.slug },
      select: { id: true },
    });
    if (!shop) {
      res.status(404).json({ error: "SHOP_NOT_FOUND" });
      return;
    }

    const appt = await prisma.appointment.findFirst({
      where: { id: req.params.id, shopId: shop.id },
      select: { id: true, status: true, guestPhone: true },
    });
    if (!appt) {
      res.status(404).json({ error: "APPOINTMENT_NOT_FOUND" });
      return;
    }

    const normalize = (s) => String(s || "").replace(/\D/g, "");
    if (normalize(appt.guestPhone) !== normalize(body.phone)) {
      res.status(403).json({ error: "PHONE_MISMATCH" });
      return;
    }

    if (["CANCELED", "COMPLETED", "NO_SHOW"].includes(appt.status)) {
      res.json({ ok: true });
      return;
    }

    const updated = await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "CANCELED" },
    });

    const shop2 = await prisma.shop.findUnique({ where: { id: shop.id } });
    const ent = getEntitlementsForShop(shop2);
    if ((ent.features || []).includes("ENLACE_SYNC") && shop2?.enlaceTokenApp) {
      await enqueueEvent({
        shopId: shop.id,
        endpoint: "agenda-cancelar",
        method: "POST",
        body: {
          id_cita_app: updated.id,
          estado: "CANCELED",
          agenda: { user_id: shop2.enlaceProfileId || null, id_cita_app: updated.id, op: "delete" },
        },
      });
    }

    res.json({ ok: true });
  }),
);

// ── ENLACE → Peluquería Cancellation Callback ───────────────────
app.post(
  "/public/enlace/cancel-appointment",
  asyncHandler(async (req, res) => {
    const { token, external_id } = z.object({
      token: z.string(),
      external_id: z.string(),
    }).parse(req.body);

    // Verify token matches a connected shop
    const shop = await prisma.shop.findFirst({
      where: { enlaceTokenApp: token },
    });

    if (!shop) {
      res.status(401).json({ error: "UNAUTHORIZED_TOKEN" });
      return;
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: external_id, shopId: shop.id },
    });

    if (!appointment) {
      res.status(404).json({ error: "APPOINTMENT_NOT_FOUND" });
      return;
    }

    // Delete the appointment locally
    await prisma.appointment.delete({
      where: { id: appointment.id },
    });

    res.json({ ok: true, message: "Appointment deleted successfully on Peluquería" });
  }),
);

// ── PATCH /api/shop ─────────────────────────────────────────
app.patch(
  "/api/shop",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z.object({
      name: z.string().min(1).optional(),
      phone: z.string().optional(),
      city: z.string().optional(),
      openTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      breakStart: z.string().nullable().optional(),
      breakEnd: z.string().nullable().optional(),
      slotMinutes: z.number().int().min(15).max(120).optional(),
      activeDays: z.array(z.number().int().min(0).max(6)).optional(),
      cancellationPolicy: z.string().optional(),
      logoUrl: z.string().nullable().optional(),
      depositEnabled: z.boolean().optional(),
      prepaymentEnabled: z.boolean().optional(),
      fastPaymentEnabled: z.boolean().optional(),
      barberBankName: z.string().nullable().optional(),
      barberBankAccountType: z.string().nullable().optional(),
      barberBankAccountNumber: z.string().nullable().optional(),
      barberBankRut: z.string().nullable().optional(),
      barberBankOwnerName: z.string().nullable().optional(),
      barberBankEmail: z.string().nullable().optional(),
      businessType: z.enum(['salud', 'profesional', 'barberia', 'peluqueria']).optional(),
      planId: z.enum(['BASIC', 'PLUS', 'PRO']).optional(),
    }).parse(req.body);
    const shop = await prisma.shop.update({
      where: { id: req.session.shopId },
      data: body,
    });
    res.json({ shop });
  }),
);

// ── CRUD /api/clients ────────────────────────────────────────
app.get("/api/clients", requireAuth, asyncHandler(async (req, res) => {
  const clients = await prisma.client.findMany({
    where: { shopId: req.session.shopId },
    orderBy: { fullName: "asc" },
    include: {
      appointments: {
        include: { service: true },
        orderBy: { startsAt: "desc" },
        take: 20,
      },
    },
  });
  res.json({ clients });
}));

app.post("/api/clients", requireAuth, asyncHandler(async (req, res) => {
  const body = z.object({
    fullName: z.string().min(2),
    phone: z.string().optional(),
    email: z.preprocess(
      v => {
        if (typeof v !== 'string') return undefined;
        const t = v.trim();
        return t === "" ? undefined : t;
      },
      z.string().email().optional()
    ),
    notes: z.string().optional(),
    colorFormula: z.string().optional(),
  }).parse(req.body);

  const client = await prisma.client.create({
    data: { shopId: req.session.shopId, ...body },
  });
  res.json({ client });
}));

app.patch("/api/clients/:id", requireAuth, asyncHandler(async (req, res) => {
  const body = z.object({
    fullName: z.string().min(2).optional(),
    phone: z.string().optional(),
    email: z.preprocess(
      v => {
        if (typeof v !== 'string') return undefined;
        const t = v.trim();
        return t === "" ? undefined : t;
      },
      z.string().email().optional()
    ),
    notes: z.string().optional(),
    colorFormula: z.string().optional(),
  }).parse(req.body);

  const client = await prisma.client.update({
    where: { id: req.params.id, shopId: req.session.shopId },
    data: body,
  });
  res.json({ client });
}));

app.delete("/api/clients/:id", requireAuth, asyncHandler(async (req, res) => {
  await prisma.client.delete({
    where: { id: req.params.id, shopId: req.session.shopId },
  });
  res.json({ ok: true });
}));

// ── POST /api/appointments (admin crea cita / walk-in) ───────
app.post(
  "/api/appointments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z.object({
      serviceId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      clientId: z.string().optional(),
      guestName: z.string().optional(),
      guestPhone: z.string().optional(),
      notes: z.string().optional(),
      tipo: z.enum(["manual", "walkin"]).optional(),
      professionalId: z.string().optional(),
    }).parse(req.body);

    const service = await prisma.service.findFirst({
      where: { id: body.serviceId, shopId: req.session.shopId, active: true },
    });
    if (!service) { res.status(404).json({ error: "SERVICE_NOT_FOUND" }); return; }

    const startsAt = dateAtTime(body.date, body.time);
    const endsAt = new Date(startsAt.getTime() + service.durationMin * 60 * 1000);

    const appointment = await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          shopId: req.session.shopId,
          professionalId: body.professionalId || null,
          ...appointmentWhereVisible(),
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      });
      if (conflict) throw Object.assign(new Error("SLOT_TAKEN"), { code: "SLOT_TAKEN" });

      return await tx.appointment.create({
        data: {
          shopId: req.session.shopId,
          serviceId: service.id,
          clientId: body.clientId || null,
          guestName: body.guestName || null,
          guestPhone: body.guestPhone || null,
          notes: body.notes || null,
          professionalId: body.professionalId || null,
          startsAt,
          endsAt,
          price: service.price,
          status: body.tipo === "walkin" ? "IN_PROGRESS" : "CONFIRMED",
        },
      });
    });

    const shop = req.shop;
    const ent = req.entitlements;
    if ((ent?.features || []).includes("ENLACE_SYNC") && shop?.enlaceTokenApp) {
      let clientName = body.guestName || "";
      let clientPhone = body.guestPhone || "";

      if (body.clientId && (!clientName || !clientPhone)) {
        const dbClient = await prisma.client.findUnique({ where: { id: body.clientId } });
        if (dbClient) {
          if (!clientName) clientName = dbClient.fullName;
          if (!clientPhone) clientPhone = dbClient.phone || "";
        }
      }

      await enqueueEvent({
        shopId: shop.id,
        endpoint: "agenda-reserva",
        method: "POST",
        body: {
          id_cita_app: appointment.id,
          estado: appointment.status,
          inicio: startsAt.toISOString(),
          fin: endsAt.toISOString(),
          servicio: service.name,
          cliente_nombre: clientName,
          cliente_telefono: clientPhone,
          agenda: {
            user_id: shop.enlaceProfileId || null,
            client_name: clientName,
            service: service.name,
            date: body.date,
            time: body.time,
            location: null,
            status: appointment.status === "IN_PROGRESS" ? "completed" : "new",
            notes: body.notes || null,
          },
        },
      });
    }

    res.json({ appointment });
  }),
);

// ── DELETE /api/appointments/:id ──────────────────────────────
app.delete(
  "/api/appointments/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, shopId: req.session.shopId },
    });

    if (!appointment) {
      res.status(404).json({ error: "APPOINTMENT_NOT_FOUND" });
      return;
    }

    await prisma.appointment.delete({
      where: { id: req.params.id },
    });

    const shop = req.shop;
    const ent = req.entitlements;
    if ((ent?.features || []).includes("ENLACE_SYNC") && shop?.enlaceTokenApp) {
      await enqueueEvent({
        shopId: shop.id,
        endpoint: "agenda-cancelar",
        method: "POST",
        body: {
          id_cita_app: appointment.id,
          estado: "CANCELED",
          agenda: { user_id: shop.enlaceProfileId || null, id_cita_app: appointment.id, op: "delete" },
        },
      });
    }

    res.json({ ok: true });
  }),
);

// ── CRUD /api/expenses ─────────────────────────────────────────
app.get('/api/expenses', requireAuth, asyncHandler(async (req, res) => {
  const expenses = await prisma.monthlyExpense.findMany({
    where: { shopId: req.session.shopId, activo: true },
    orderBy: { nombre: 'asc' },
  })
  res.json({ expenses })
}))

app.post('/api/expenses', requireAuth, asyncHandler(async (req, res) => {
  const body = z.object({
    nombre: z.string().min(2),
    monto: z.number().min(0),
    categoria: z.enum(['arriendo', 'servicios', 'equipos', 'marketing', 'personal', 'general']).optional(),
  }).parse(req.body)
  const expense = await prisma.monthlyExpense.create({
    data: { shopId: req.session.shopId, ...body },
  })
  res.json({ expense })
}))

app.patch('/api/expenses/:id', requireAuth, asyncHandler(async (req, res) => {
  const body = z.object({
    nombre: z.string().min(2).optional(),
    monto: z.number().min(0).optional(),
    categoria: z.string().optional(),
    activo: z.boolean().optional(),
  }).parse(req.body)
  const expense = await prisma.monthlyExpense.update({
    where: { id: req.params.id, shopId: req.session.shopId },
    data: body,
  })
  res.json({ expense })
}))

app.delete('/api/expenses/:id', requireAuth, asyncHandler(async (req, res) => {
  await prisma.monthlyExpense.delete({
    where: { id: req.params.id, shopId: req.session.shopId },
  })
  res.json({ ok: true })
}))

// ── Blocked Slots ──────────────────────────────────────────────
app.get('/api/blocked-slots', requireAuth, asyncHandler(async (req, res) => {
  const { date } = req.query
  const where = { shopId: req.session.shopId }
  if (date) where.date = date
  const slots = await prisma.blockedSlot.findMany({ where })
  res.json({ slots })
}))

app.post('/api/blocked-slots', requireAuth, asyncHandler(async (req, res) => {
  const body = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    reason: z.string().optional(),
    repeat: z.enum(['once', 'daily_week', 'daily_month', 'weekly_month']).optional(),
  }).parse(req.body)

  const slotsToCreate = []
  const baseDate = new Date(`${body.date}T12:00:00`)

  const addSlot = (daysOffset) => {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + daysOffset)
    slotsToCreate.push({
      shopId: req.session.shopId,
      date: d.toISOString().split('T')[0],
      startTime: body.startTime,
      endTime: body.endTime,
      reason: body.reason || ''
    })
  }

  if (!body.repeat || body.repeat === 'once') {
    addSlot(0)
  } else if (body.repeat === 'daily_week') {
    for (let i = 0; i < 7; i++) addSlot(i)
  } else if (body.repeat === 'daily_month') {
    for (let i = 0; i < 30; i++) addSlot(i)
  } else if (body.repeat === 'weekly_month') {
    for (let i = 0; i < 4; i++) addSlot(i * 7)
  }

  await Promise.all(
    slotsToCreate.map(slot =>
      prisma.blockedSlot.create({ data: slot })
    )
  )

  res.json({ ok: true, count: slotsToCreate.length })
}))

app.delete('/api/blocked-slots/:id', requireAuth, asyncHandler(async (req, res) => {
  await prisma.blockedSlot.delete({
    where: { id: req.params.id, shopId: req.session.shopId },
  })
  res.json({ ok: true })
}))

// ── CRUD Professionals ──────────────────────────────────────
app.get('/api/professionals', requireAuth, asyncHandler(async (req, res) => {
  const professionals = await prisma.professional.findMany({
    where: { shopId: req.session.shopId, active: true },
    orderBy: { name: 'asc' },
  })
  res.json({ professionals })
}))

app.post('/api/professionals', requireAuth, asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findUnique({ where: { id: req.session.shopId } })
  const count = await prisma.professional.count({ where: { shopId: req.session.shopId, active: true } })
  const planId = shop?.planId || 'BASIC'

  if (planId === 'BASIC' && count >= 1) {
    res.status(403).json({ error: "LIMIT_REACHED", message: "Tu plan Starter solo permite 1 profesional. Sube a Pro o Premium para agregar más." })
    return
  }
  if (planId === 'PLUS' && count >= 3) {
    res.status(403).json({ error: "LIMIT_REACHED", message: "Tu plan Pro permite hasta 3 profesionales. Sube a Premium para agregar profesionales ilimitados." })
    return
  }

  const body = z.object({
    name: z.string().min(2),
    title: z.string().optional(),
    photo: z.string().optional(),
  }).parse(req.body)
  const prof = await prisma.professional.create({
    data: { shopId: req.session.shopId, ...body },
  })
  res.json({ professional: prof })
}))

app.patch('/api/professionals/:id', requireAuth, asyncHandler(async (req, res) => {
  const body = z.object({
    name: z.string().min(2).optional(),
    title: z.string().optional(),
    photo: z.string().optional(),
    active: z.boolean().optional(),
  }).parse(req.body)
  const prof = await prisma.professional.update({
    where: { id: req.params.id, shopId: req.session.shopId },
    data: body,
  })
  res.json({ professional: prof })
}))

app.delete('/api/professionals/:id', requireAuth, asyncHandler(async (req, res) => {
  // Instead of deleting, we usually deactivate
  await prisma.professional.update({
    where: { id: req.params.id, shopId: req.session.shopId },
    data: { active: false },
  })
  res.json({ ok: true })
}))

// ── CRUD CashExtras ─────────────────────────────────────────
app.get('/api/cash-extras', requireAuth, asyncHandler(async (req, res) => {
  const { date } = req.query
  const extras = await prisma.cashExtra.findMany({
    where: { shopId: req.session.shopId, date },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ extras })
}))

app.post('/api/cash-extras', requireAuth, asyncHandler(async (req, res) => {
  const body = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    concept: z.string().min(1),
    amount: z.number(),
    type: z.enum(['ingreso', 'egreso']),
  }).parse(req.body)
  const extra = await prisma.cashExtra.create({
    data: { shopId: req.session.shopId, ...body },
  })
  res.json({ extra })
}))

app.delete('/api/cash-extras/:id', requireAuth, asyncHandler(async (req, res) => {
  await prisma.cashExtra.delete({
    where: { id: req.params.id, shopId: req.session.shopId },
  })
  res.json({ ok: true })
}))
app.delete(
  "/api/account",
  requireAuth,
  asyncHandler(async (req, res) => {
    const shopId = req.session.shopId;
    const adminUserId = req.session.adminUserId;
    
    const body = z.object({ email: z.string().email() }).parse(req.body);
    
    // Verificar que el email coincida con el usuario actual
    const user = await prisma.adminUser.findUnique({ where: { id: adminUserId } });
    if (user.email !== body.email) {
      return res.status(400).json({ error: "EMAIL_MISMATCH" });
    }

    // Eliminar la tienda. Cascade delete se encarga del resto.
    await prisma.shop.delete({ where: { id: shopId } });

    // Limpiar sesión
    req.session = null;

    res.json({ ok: true });
  })
);

// Servir frontend compilado en producción
const webDistPath = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  app.get('{*path}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/public')) {
      return next();
    }
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('[GLOBAL ERROR HANDLER]:', err);
  if (err?.code === "SLOT_TAKEN") {
    res.status(409).json({ error: "SLOT_TAKEN" });
    return;
  }
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: "BAD_REQUEST" });
    return;
  }
  res.status(500).json({ error: "SERVER_ERROR" });
});

const port = Number(process.env.PORT || 5184);
app.listen(port, () => {
  process.stdout.write(`Agenda Pro API listening on http://localhost:${port}\n`);
});

setInterval(() => {
  processOutboxOnce().catch(() => { });
  pollCancellations().catch(() => { });
}, 30 * 1000);


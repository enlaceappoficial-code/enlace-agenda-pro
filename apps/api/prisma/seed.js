const bcrypt = require("bcryptjs");

const { prisma } = require("../src/prisma");

async function main() {
  const shop = await prisma.shop.upsert({
    where: { slug: "demo-agenda" },
    update: { appId: "AGENDA_PRO", businessType: "salud", planId: "BASIC" },
    create: {
      appId: "AGENDA_PRO",
      businessType: "salud",
      planId: "BASIC",
      name: "Centro de Atención & Agenda Pro",
      phone: "+56912345678",
      city: "La Serena",
      slug: "demo-agenda",
      openTime: "08:30",
      closeTime: "19:30",
      slotMinutes: 30,
      breakStart: "13:30",
      breakEnd: "14:30",
      activeDays: [1, 2, 3, 4, 5, 6],
      cancellationPolicy:
        "Cancela o reprograma tu cita con al menos 2 horas de anticipación.",
      services: {
        create: [
          {
            name: "Consulta General / Evaluación",
            category: "Salud & Bienestar",
            durationMin: 30,
            price: 25000,
            description: "Atención personalizada presencial u online con evaluación inicial.",
            active: true,
          },
          {
            name: "Sesión Especializada / Terapia",
            category: "Salud & Bienestar",
            durationMin: 50,
            price: 35000,
            description: "Sesión completa de tratamiento o terapia especializada.",
            active: true,
          },
          {
            name: "Teleatención Online",
            category: "Salud & Bienestar",
            durationMin: 30,
            price: 20000,
            description: "Videoconsulta remota con envío de pautas y recetas digitales.",
            active: true,
          },
          {
            name: "Asesoría Profesional / Consultoría",
            category: "Asesoría & Negocios",
            durationMin: 45,
            price: 40000,
            description: "Sesión de diagnóstico y asesoría estratégica personalizada.",
            active: true,
          },
          {
            name: "Reunión de Seguimiento de Proyecto",
            category: "Asesoría & Negocios",
            durationMin: 30,
            price: 25000,
            description: "Revisión de avances, entregables y próximos pasos de trabajo.",
            active: true,
          },
        ],
      },
    },
    include: { services: true },
  });

  const adminEmail = "admin@enlace.cl";
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { shopId: shop.id, passwordHash },
    create: { email: adminEmail, passwordHash, shopId: shop.id },
  });
  
  console.log("Seed completado para Enlace Agenda Pro:", shop.slug);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    throw e;
  });

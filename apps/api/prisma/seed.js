const bcrypt = require("bcryptjs");

const { prisma } = require("../src/prisma");

async function main() {
  const shop = await prisma.shop.upsert({
    where: { slug: "mi-barberia" },
    update: { appId: "PELUQUERIA", planId: "BASIC" },
    create: {
      appId: "PELUQUERIA",
      planId: "BASIC",
      name: "Barbería Demo",
      phone: "+56912345678",
      city: "La Serena",
      slug: "mi-barberia",
      openTime: "09:00",
      closeTime: "20:00",
      slotMinutes: 30,
      breakStart: "14:00",
      breakEnd: "15:00",
      activeDays: [1, 2, 3, 4, 5, 6],
      cancellationPolicy:
        "Cancela con al menos 2 horas de anticipación. No-shows frecuentes pueden requerir depósito.",
      services: {
        create: [
          {
            name: "Corte hombre",
            category: "Corte",
            durationMin: 30,
            price: 8000,
            description: "Corte clásico o moderno",
            active: true,
          },
          {
            name: "Corte + barba",
            category: "Corte",
            durationMin: 45,
            price: 12000,
            description: "Corte y perfilado de barba",
            active: true,
          },
          {
            name: "Afeitado clásico",
            category: "Barba",
            durationMin: 30,
            price: 9000,
            description: "Afeitado con toalla caliente",
            active: true,
          },
          {
            name: "Perfilado de barba",
            category: "Barba",
            durationMin: 20,
            price: 7000,
            description: "Perfilado y arreglo",
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
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    throw e;
  });


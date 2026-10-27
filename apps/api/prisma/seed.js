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
            name: "Asesoría de Portafolio Docente (Módulo 1 & 2)",
            category: "Asesorías & Mentoría",
            modality: "ONLINE",
            durationMin: 60,
            price: 35000,
            description: "Revisión 1 a 1 de evidencias, planificaciones y rúbricas.",
            instructions: "Se enviará el enlace de Google Meet por WhatsApp o correo 15 min antes.",
            active: true,
          },
          {
            name: "Clase Particular / Tutoría de Refuerzo",
            category: "Clases & Tutorías",
            modality: "PRESENCIAL",
            durationMin: 60,
            price: 20000,
            description: "Sesión presencial personalizada para nivelación y apoyo pedagógico.",
            instructions: "Traer cuaderno, estuche y materias específicas a reforzar.",
            active: true,
          },
          {
            name: "Timbre Automático Personalizado (38x14mm)",
            category: "Timbres & Sellos",
            modality: "ENCARGO",
            durationMin: 15,
            price: 12990,
            description: "Timbre autoentintable de alta durabilidad para profesionales o docentes.",
            instructions: "Fabricación demora 24 a 48 hrs hábiles. Indicar en notas el texto, RUT y color de tinta (negro/azul/rojo).",
            active: true,
          },
          {
            name: "Sello Didáctico Docente Motivacional",
            category: "Timbres & Sellos",
            modality: "ENCARGO",
            durationMin: 15,
            price: 8990,
            description: "Sellos con frases motivacionales ('¡Excelente trabajo!', 'Revisado', etc.).",
            instructions: "Indicar diseño elegido, frase y color de tinta en las especificaciones.",
            active: true,
          },
          {
            name: "Sesión de Orientación y Diagnóstico Inicial",
            category: "Asesorías & Mentoría",
            modality: "ONLINE",
            durationMin: 30,
            price: 15000,
            description: "Evaluación inicial de necesidades y planificación de acompañamiento.",
            instructions: "Sesión remota vía Google Meet para revisar tu plan de estudio o portafolio.",
            active: true,
          },
        ],
      },
    },
    include: { services: true },
  });

  // Asegurar que los servicios del demo tengan las modalidades e instrucciones correctas
  const existingShop = await prisma.shop.findUnique({
    where: { slug: "demo-agenda" },
    include: { services: true }
  });
  
  if (existingShop && existingShop.services.length === 0) {
    const defaultServices = [
      {
        name: "Asesoría de Portafolio Docente (Módulo 1 & 2)",
        category: "Asesorías & Mentoría",
        modality: "ONLINE",
        durationMin: 60,
        price: 35000,
        description: "Revisión 1 a 1 de evidencias, planificaciones y rúbricas.",
        instructions: "Se enviará el enlace de Google Meet por WhatsApp o correo 15 min antes.",
        active: true,
        shopId: existingShop.id
      },
      {
        name: "Clase Particular / Tutoría de Refuerzo",
        category: "Clases & Tutorías",
        modality: "PRESENCIAL",
        durationMin: 60,
        price: 20000,
        description: "Sesión presencial personalizada para nivelación y apoyo pedagógico.",
        instructions: "Traer cuaderno, estuche y materias específicas a reforzar.",
        active: true,
        shopId: existingShop.id
      },
      {
        name: "Timbre Automático Personalizado (38x14mm)",
        category: "Timbres & Sellos",
        modality: "ENCARGO",
        durationMin: 15,
        price: 12990,
        description: "Timbre autoentintable de alta durabilidad para profesionales o docentes.",
        instructions: "Fabricación demora 24 a 48 hrs hábiles. Indicar en notas el texto, RUT y color de tinta (negro/azul/rojo).",
        active: true,
        shopId: existingShop.id
      },
      {
        name: "Sello Didáctico Docente Motivacional",
        category: "Timbres & Sellos",
        modality: "ENCARGO",
        durationMin: 15,
        price: 8990,
        description: "Sellos con frases motivacionales ('¡Excelente trabajo!', 'Revisado', etc.).",
        instructions: "Indicar diseño elegido, frase y color de tinta en las especificaciones.",
        active: true,
        shopId: existingShop.id
      },
      {
        name: "Sesión de Orientación y Diagnóstico Inicial",
        category: "Asesorías & Mentoría",
        modality: "ONLINE",
        durationMin: 30,
        price: 15000,
        description: "Evaluación inicial de necesidades y planificación de acompañamiento.",
        instructions: "Sesión remota vía Google Meet para revisar tu plan de estudio o portafolio.",
        active: true,
        shopId: existingShop.id
      }
    ];

    for (const s of defaultServices) {
      await prisma.service.create({ data: s });
    }
  }

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

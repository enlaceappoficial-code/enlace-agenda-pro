const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function main() {
  console.log("Generando 100 códigos de acceso...");
  
  const codes = [];
  for (let i = 0; i < 100; i++) {
    // Generate a random 8-character code
    const code = "ENLACE-" + crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  
  // Insert into DB
  let createdCount = 0;
  for (const code of codes) {
    try {
      await prisma.accessCode.create({
        data: {
          code: code,
          planId: "PRO",
          durationMonths: 6, // 6 meses gratis
          maxUses: 1,
        }
      });
      createdCount++;
    } catch (e) {
      // Ignore duplicates if any (rare with random bytes)
      console.error(`Error creando código ${code}:`, e.message);
    }
  }
  
  console.log(`Se crearon con éxito ${createdCount} códigos.`);
  console.log("Muestra de códigos:");
  console.log(codes.slice(0, 10));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

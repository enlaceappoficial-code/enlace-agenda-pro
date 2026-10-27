require("dotenv/config");

const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const { PrismaClient } = require("@prisma/client");

const url = process.env.DATABASE_URL || "file:./dev.db";
console.log("!!! PRISMA CONNECTING... DATABASE_URL:", url);

const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

module.exports = { prisma };

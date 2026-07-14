require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Reuse the same client across warm Vercel invocations to avoid reconnect overhead.
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new PrismaClient();
globalForPrisma.prisma = prisma;

module.exports = prisma;

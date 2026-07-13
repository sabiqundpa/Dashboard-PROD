const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Set all existing users (except produksi) to maintenance role
  const result = await prisma.admin.updateMany({
    where: { username: { not: 'produksi' } },
    data: { role: 'maintenance' },
  });
  console.log('Updated', result.count, 'user(s) to maintenance role');

  const all = await prisma.admin.findMany({ select: { username: true, role: true } });
  all.forEach((u) => console.log(' -', u.username, '|', u.role));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

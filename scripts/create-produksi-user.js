const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('produksi123', 10);
  const user = await prisma.admin.upsert({
    where: { username: 'produksi' },
    update: { role: 'produksi', passwordHash: hash },
    create: { username: 'produksi', passwordHash: hash, role: 'produksi' },
  });
  console.log('OK:', user.username, '|', user.role);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

require('dotenv').config();
const prisma = require('../src/db');

async function main() {
  console.log('Fetching all breakdowns...');
  const all = await prisma.breakdown.findMany({
    select: { id: true, machineId: true, date: true, startTime: true, cause: true },
    orderBy: { id: 'asc' },
  });
  console.log(`Total records: ${all.length}`);

  const seen = new Map();
  const toDelete = [];

  for (const b of all) {
    const d = b.date instanceof Date ? b.date : new Date(b.date);
    const causeKey = String(b.cause || '').trim().toLowerCase().slice(0, 50);
    const fp = `${b.machineId}|${d.toISOString().slice(0, 10)}|${b.startTime || ''}|${causeKey}`;
    if (seen.has(fp)) {
      toDelete.push(b.id);
    } else {
      seen.set(fp, b.id);
    }
  }

  console.log(`Duplicates found: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('No duplicates to remove.');
    return;
  }

  console.log('Deleting duplicates...');
  const result = await prisma.breakdown.deleteMany({ where: { id: { in: toDelete } } });
  console.log(`Deleted: ${result.count} records`);
  console.log(`Remaining: ${all.length - result.count} records`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

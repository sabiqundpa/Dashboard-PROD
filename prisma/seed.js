const prisma = require('../src/db');

const machines = [
  { name: 'CNC-01', cluster: 'Cluster A', line: 'Line 1', status: 'running' },
  { name: 'CNC-02', cluster: 'Cluster A', line: 'Line 1', status: 'down' },
  { name: 'CNC-03', cluster: 'Cluster A', line: 'Line 2', status: 'running' },
  { name: 'CNC-04', cluster: 'Cluster B', line: 'Line 2', status: 'idle' },
  { name: 'CNC-05', cluster: 'Cluster B', line: 'Line 3', status: 'maintenance' },
  { name: 'CNC-06', cluster: 'Cluster B', line: 'Line 3', status: 'running' },
];

function daysAgo(n, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const created = {};
  for (const m of machines) {
    const machine = await prisma.machine.upsert({
      where: { name: m.name },
      update: { cluster: m.cluster, line: m.line, status: m.status },
      create: m,
    });
    created[m.name] = machine;
  }

  const breakdowns = [
    { machine: 'CNC-02', cause: 'Tool holder broken', category: 'Mechanical', severity: 'critical', status: 'open', date: daysAgo(0, 8, 15), startTime: '08:15', endDate: null, endTime: null, durationHrs: 0, picGh: 'Andi' },
    { machine: 'CNC-01', cause: 'Spindle overheat', category: 'Electrical', severity: 'warning', status: 'resolved', date: daysAgo(0, 6, 30), startTime: '06:30', endDate: daysAgo(0, 7, 42), endTime: '07:42', durationHrs: 1.2, picGh: 'Budi', picMtn: 'Eko', resolution: 'Spindle didinginkan dan thermal sensor diganti', action: 'Ganti thermal sensor' },
    { machine: 'CNC-04', cause: 'Belt wear', category: 'Mechanical', severity: 'warning', status: 'resolved', date: daysAgo(1, 14, 0), startTime: '14:00', endDate: daysAgo(1, 16, 0), endTime: '16:00', durationHrs: 2.0, picGh: 'Cahyo', picMtn: 'Eko', resolution: 'Belt diganti dengan yang baru', action: 'Ganti V-belt' },
    { machine: 'CNC-03', cause: 'Coolant leak', category: 'Hydraulic', severity: 'info', status: 'resolved', date: daysAgo(1, 9, 10), startTime: '09:10', endDate: daysAgo(1, 9, 58), endTime: '09:58', durationHrs: 0.8, picGh: 'Andi', picMtn: 'Fajar', resolution: 'Kebocoran selang coolant ditambal', action: 'Tambal & kencangkan klem selang' },
    { machine: 'CNC-05', cause: 'Scheduled PM', category: 'Preventive', severity: 'info', status: 'resolved', date: daysAgo(3, 8, 0), startTime: '08:00', endDate: daysAgo(3, 12, 12), endTime: '12:12', durationHrs: 4.2, picGh: 'Budi', picMtn: 'Fajar', resolution: 'Preventive maintenance selesai', action: 'Lubrikasi & kalibrasi' },
    { machine: 'CNC-02', cause: 'Tool Wear / Breakage', category: 'Mechanical', severity: 'warning', status: 'resolved', date: daysAgo(2, 10, 0), startTime: '10:00', endDate: daysAgo(2, 11, 30), endTime: '11:30', durationHrs: 1.5, picGh: 'Cahyo', picMtn: 'Eko', resolution: 'Tool diganti', action: 'Ganti cutting tool' },
    { machine: 'CNC-01', cause: 'Tool Wear / Breakage', category: 'Mechanical', severity: 'warning', status: 'resolved', date: daysAgo(4, 13, 0), startTime: '13:00', endDate: daysAgo(4, 14, 20), endTime: '14:20', durationHrs: 1.3, picGh: 'Andi', picMtn: 'Fajar', resolution: 'Tool diganti', action: 'Ganti cutting tool' },
    { machine: 'CNC-06', cause: 'Electrical Fault', category: 'Electrical', severity: 'critical', status: 'resolved', date: daysAgo(5, 7, 0), startTime: '07:00', endDate: daysAgo(5, 9, 30), endTime: '09:30', durationHrs: 2.5, picGh: 'Budi', picMtn: 'Eko', resolution: 'Kabel kontrol diperbaiki', action: 'Perbaikan wiring panel kontrol' },
  ];

  for (const b of breakdowns) {
    await prisma.breakdown.create({
      data: {
        machineId: created[b.machine].id,
        cause: b.cause,
        category: b.category,
        severity: b.severity,
        status: b.status,
        date: b.date,
        startTime: b.startTime,
        endDate: b.endDate,
        endTime: b.endTime,
        durationHrs: b.durationHrs,
        picGh: b.picGh,
        picMtn: b.picMtn || null,
        resolution: b.resolution || null,
        action: b.action || null,
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

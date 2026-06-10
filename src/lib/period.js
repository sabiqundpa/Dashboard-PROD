function getPeriodRange(period) {
  const now = new Date();
  const end = now;
  let start;

  if (period === 'week') {
    start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    // default: today
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  return { start, end };
}

function daysInRange(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, ms / (1000 * 60 * 60 * 24));
}

module.exports = { getPeriodRange, daysInRange };

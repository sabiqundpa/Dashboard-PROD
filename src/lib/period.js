// Calendar-aligned period range, anchored to an optional reference date
// (defaults to now). Aligned with the bucketing used by /downtime-by-day
// and /mtbf-mttr-trend so every endpoint agrees on what "this week"/
// "this month" means.
function getPeriodRange(period, refDateStr, rangeStartStr, rangeEndStr) {
  if (period === 'range' && rangeStartStr && rangeEndStr) {
    const s = new Date(rangeStartStr); s.setHours(0, 0, 0, 0);
    const e = new Date(rangeEndStr); e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }

  const ref = refDateStr ? new Date(refDateStr) : new Date();
  let start, end;

  if (period === 'week') {
    const dayOfWeek = ref.getDay(); // 0 = Sunday .. 6 = Saturday
    const mondayOffset = (dayOfWeek + 6) % 7;
    start = new Date(ref);
    start.setDate(start.getDate() - mondayOffset);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'month') {
    start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    // default: a single day (today, or the chosen reference date)
    start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
  }

  return { start, end };
}

function daysInRange(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, ms / (1000 * 60 * 60 * 24));
}

module.exports = { getPeriodRange, daysInRange };

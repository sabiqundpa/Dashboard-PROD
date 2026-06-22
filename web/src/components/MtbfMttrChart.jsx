import LineTrendChart from './LineTrendChart.jsx';

// Targets scale with the machines' total daily working hours (Jam Kerja
// Harian) instead of being a fixed number, since a fleet with more daily
// working hours naturally accumulates more uptime between failures.
//   MTBF target = Jam Kerja Harian x 5   (no more than 1 breakdown / 5 hari kerja)
//   MTTR target = Jam Kerja Harian x 0.1 (perbaikan maks. 10% dari 1 hari kerja)
const MTBF_TARGET_MULTIPLIER = 5;
const MTTR_TARGET_MULTIPLIER = 0.1;

export default function MtbfMttrChart({ kpi, data }) {
  const plannedPerDay = kpi?.planned_hours_per_day || 0;
  const mtbfTarget = Number((plannedPerDay * MTBF_TARGET_MULTIPLIER).toFixed(1));
  const mttrTarget = Number((plannedPerDay * MTTR_TARGET_MULTIPLIER).toFixed(1));

  return (
    <>
      <LineTrendChart
        title="MTBF Trend" sub="Mean Time Between Failure (jam antara problem)"
        data={data} valueKey="mtbf" color="#a855f7" unit="jam"
        target={mtbfTarget} targetLabel={`${mtbfTarget} jam (= Jam Kerja Harian × ${MTBF_TARGET_MULTIPLIER})`}
      />
      <LineTrendChart
        title="MTTR Trend" sub="Mean Time To Repair (jam untuk perbaikan)"
        data={data} valueKey="mttr" color="#00d084" unit="jam"
        target={mttrTarget} targetLabel={`${mttrTarget} jam (= Jam Kerja Harian × ${MTTR_TARGET_MULTIPLIER})`}
      />
    </>
  );
}

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CalendarDays } from 'lucide-react';

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Hari' },
  { key: 'week',  label: 'Minggu' },
  { key: 'month', label: 'Bulan' },
];
const MONTH_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const DOW_ID   = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

function parseLocal(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatLabel(period, dateStr) {
  const d = parseLocal(dateStr);
  if (period === 'month') return `${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`;
  if (period === 'week') {
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay()+6)%7));
    const sun = new Date(mon); sun.setDate(mon.getDate()+6);
    return mon.getMonth() === sun.getMonth()
      ? `${mon.getDate()}–${sun.getDate()} ${MONTH_ID[mon.getMonth()]}`
      : `${mon.getDate()} ${MONTH_ID[mon.getMonth()]} – ${sun.getDate()} ${MONTH_ID[sun.getMonth()]}`;
  }
  return `${d.getDate()} ${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`;
}
function shiftDate(period, dateStr, dir) {
  const d = parseLocal(dateStr);
  if (period === 'month') d.setMonth(d.getMonth() + dir);
  else if (period === 'week') d.setDate(d.getDate() + dir * 7);
  else d.setDate(d.getDate() + dir);
  return toStr(d);
}

function MonthGrid({ dateStr, onChange }) {
  const sel = parseLocal(dateStr);
  const [year, setYear] = useState(sel.getFullYear());
  return (
    <div className="dp-popup">
      <div className="dp-header">
        <button className="dp-nav" onClick={() => setYear(y => y-1)}><ChevronsLeft size={13}/></button>
        <span className="dp-title">{year}</span>
        <button className="dp-nav" onClick={() => setYear(y => y+1)}><ChevronsRight size={13}/></button>
      </div>
      <div className="dp-month-grid">
        {MONTH_ID.map((m, i) => (
          <button key={i}
            className={'dp-month-cell' + (year === sel.getFullYear() && i === sel.getMonth() ? ' sel' : '')}
            onClick={() => onChange(toStr(new Date(year, i, 1)))}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

function DayCalendar({ dateStr, period, onChange }) {
  const sel = parseLocal(dateStr);
  const [vm, setVm] = useState(new Date(sel.getFullYear(), sel.getMonth(), 1));
  const today = new Date(); today.setHours(0,0,0,0);

  // 42-cell Sun-start grid
  const startDow = vm.getDay();
  const dim = new Date(vm.getFullYear(), vm.getMonth()+1, 0).getDate();
  const prevDim = new Date(vm.getFullYear(), vm.getMonth(), 0).getDate();
  const cells = [];
  for (let i = startDow-1; i >= 0; i--) cells.push({ n: prevDim-i, mo: -1 });
  for (let n = 1; n <= dim; n++) cells.push({ n, mo: 0 });
  while (cells.length % 7 !== 0) cells.push({ n: cells.length - dim - startDow + 1, mo: 1 });

  // Selected week bounds
  const wkMon = new Date(sel); wkMon.setDate(sel.getDate() - ((sel.getDay()+6)%7)); wkMon.setHours(0,0,0,0);
  const wkSun = new Date(wkMon); wkSun.setDate(wkMon.getDate()+6); wkSun.setHours(0,0,0,0);

  function cellD(cell) { return new Date(vm.getFullYear(), vm.getMonth() + cell.mo, cell.n); }

  function cellCls(cell) {
    const cd = cellD(cell); cd.setHours(0,0,0,0);
    const cls = ['dp-day'];
    if (cell.mo !== 0) cls.push('other');
    if (period !== 'week') {
      if (toStr(cd) === dateStr) cls.push('sel');
    } else {
      if (cd >= wkMon && cd <= wkSun) cls.push('in-wk');
      if (toStr(cd) === toStr(wkMon)) cls.push('wk-s');
      if (toStr(cd) === toStr(wkSun)) cls.push('wk-e');
    }
    if (cd.getTime() === today.getTime()) cls.push('today');
    return cls.join(' ');
  }

  return (
    <div className="dp-popup">
      <div className="dp-header">
        <button className="dp-nav" onClick={() => setVm(d => new Date(d.getFullYear()-1, d.getMonth(), 1))}><ChevronsLeft size={12}/></button>
        <button className="dp-nav" onClick={() => setVm(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}><ChevronLeft size={12}/></button>
        <span className="dp-title">{MONTH_ID[vm.getMonth()]} {vm.getFullYear()}</span>
        <button className="dp-nav" onClick={() => setVm(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}><ChevronRight size={12}/></button>
        <button className="dp-nav" onClick={() => setVm(d => new Date(d.getFullYear()+1, d.getMonth(), 1))}><ChevronsRight size={12}/></button>
      </div>
      <div className="dp-dow-row">
        {DOW_ID.map(d => <div key={d} className="dp-dow">{d}</div>)}
      </div>
      <div className="dp-day-grid">
        {cells.map((cell, i) => (
          <button key={i} className={cellCls(cell)} onClick={() => onChange(toStr(cellD(cell)))}>
            {cell.n}
          </button>
        ))}
      </div>
      <div className="dp-today-row">
        <button className="dp-today-btn" onClick={() => onChange(toStr(today))}>Hari Ini</button>
      </div>
    </div>
  );
}

export default function PeriodPicker({ period, setPeriod, refDate, setRefDate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  return (
    <div className="period-picker" ref={ref}>
      <select className="pp-select"
        value={period}
        onChange={e => { setPeriod(e.target.value); setOpen(false); }}>
        {PERIOD_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>

      <button className="pp-nav" onClick={() => setRefDate(shiftDate(period, refDate, -1))} title="Periode sebelumnya">
        <ChevronLeft size={14}/>
      </button>

      <button className="pp-label" onClick={() => setOpen(v => !v)}>
        <span>{formatLabel(period, refDate)}</span>
        <CalendarDays size={13} style={{ color: 'var(--muted)', flexShrink: 0 }}/>
      </button>

      <button className="pp-nav" onClick={() => setRefDate(shiftDate(period, refDate, 1))} title="Periode berikutnya">
        <ChevronRight size={14}/>
      </button>

      {open && (period === 'month'
        ? <MonthGrid dateStr={refDate} onChange={d => { setRefDate(d); setOpen(false); }} />
        : <DayCalendar dateStr={refDate} period={period} onChange={d => { setRefDate(d); setOpen(false); }} />
      )}
    </div>
  );
}

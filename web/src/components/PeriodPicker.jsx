import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CalendarDays } from 'lucide-react';

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Harian' },
  { key: 'month', label: 'Bulanan' },
  { key: 'year',  label: 'Tahunan' },
  { key: 'all',   label: 'All Time' },
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
  if (period === 'all') return 'Semua Waktu';
  const d = parseLocal(dateStr);
  if (period === 'year')  return `${d.getFullYear()}`;
  if (period === 'month') return `${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`;
}
function shiftDate(period, dateStr, dir) {
  const d = parseLocal(dateStr);
  if (period === 'year')  d.setFullYear(d.getFullYear() + dir);
  else if (period === 'month') d.setMonth(d.getMonth() + dir);
  else d.setDate(d.getDate() + dir);
  return toStr(d);
}

function buildCells(vm) {
  const startDow = vm.getDay();
  const dim = new Date(vm.getFullYear(), vm.getMonth()+1, 0).getDate();
  const prevDim = new Date(vm.getFullYear(), vm.getMonth(), 0).getDate();
  const cells = [];
  for (let i = startDow-1; i >= 0; i--) cells.push({ n: prevDim-i, mo: -1 });
  for (let n = 1; n <= dim; n++) cells.push({ n, mo: 0 });
  while (cells.length % 7 !== 0) cells.push({ n: cells.length - dim - startDow + 1, mo: 1 });
  return cells;
}

function YearPicker({ dateStr, onChange }) {
  const sel = parseLocal(dateStr);
  const thisYear = new Date().getFullYear();
  const [base, setBase] = useState(Math.floor(sel.getFullYear() / 10) * 10);
  const years = Array.from({ length: 12 }, (_, i) => base + i);
  return (
    <div className="dp-popup">
      <div className="dp-header">
        <button className="dp-nav" onClick={() => setBase(b => b - 10)}><ChevronsLeft size={13}/></button>
        <span className="dp-title">{base} – {base + 11}</span>
        <button className="dp-nav" onClick={() => setBase(b => b + 10)}><ChevronsRight size={13}/></button>
      </div>
      <div className="dp-month-grid">
        {years.map(y => (
          <button key={y}
            className={'dp-month-cell' + (y === sel.getFullYear() ? ' sel' : '') + (y === thisYear ? ' today' : '')}
            onClick={() => onChange(toStr(new Date(y, 0, 1)))}>
            {y}
          </button>
        ))}
      </div>
    </div>
  );
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

function DayCalendar({ dateStr, onChange }) {
  const sel = parseLocal(dateStr);
  const [vm, setVm] = useState(new Date(sel.getFullYear(), sel.getMonth(), 1));
  const today = new Date(); today.setHours(0,0,0,0);
  const cells = buildCells(vm);
  function cellD(cell) { return new Date(vm.getFullYear(), vm.getMonth() + cell.mo, cell.n); }
  function cellCls(cell) {
    const cd = cellD(cell); cd.setHours(0,0,0,0);
    const cls = ['dp-day'];
    if (cell.mo !== 0) cls.push('other');
    if (toStr(cd) === dateStr) cls.push('sel');
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
      <div className="dp-dow-row">{DOW_ID.map(d => <div key={d} className="dp-dow">{d}</div>)}</div>
      <div className="dp-day-grid">
        {cells.map((cell, i) => (
          <button key={i} className={cellCls(cell)} onClick={() => onChange(toStr(cellD(cell)))}>{cell.n}</button>
        ))}
      </div>
      <div className="dp-today-row">
        <button className="dp-today-btn" onClick={() => onChange(toStr(today))}>Hari Ini</button>
      </div>
    </div>
  );
}

export default function PeriodPicker({ period, setPeriod, refDate, setRefDate, pill }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const isAll = period === 'all';
  const label = formatLabel(period, refDate);
  const wrapCls = `period-picker${pill ? ' pp-pill-mode' : ''}`;

  return (
    <div className={wrapCls} ref={ref}>
      <select className="pp-select" value={period}
        onChange={e => { setPeriod(e.target.value); setOpen(false); }}>
        {PERIOD_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>

      {!isAll && (
        <button className="pp-nav" onClick={() => setRefDate(shiftDate(period, refDate, -1))} title="Periode sebelumnya">
          <ChevronLeft size={16}/>
        </button>
      )}

      <button
        className={`pp-label${isAll ? ' pp-label-tail' : ''}`}
        onClick={!isAll ? () => setOpen(v => !v) : undefined}
        style={isAll ? { cursor: 'default' } : undefined}
      >
        <span>{label}</span>
        {!isAll && <CalendarDays size={13} style={{ color: 'var(--muted)', flexShrink: 0 }}/>}
      </button>

      {!isAll && (
        <button className="pp-nav pp-nav-tail" onClick={() => setRefDate(shiftDate(period, refDate, 1))} title="Periode berikutnya">
          <ChevronRight size={16}/>
        </button>
      )}

      {open && !isAll && (
        period === 'year'  ? <YearPicker  dateStr={refDate} onChange={d => { setRefDate(d); setOpen(false); }} /> :
        period === 'month' ? <MonthGrid   dateStr={refDate} onChange={d => { setRefDate(d); setOpen(false); }} /> :
                             <DayCalendar dateStr={refDate} onChange={d => { setRefDate(d); setOpen(false); }} />
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CalendarDays } from 'lucide-react';

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Hari' },
  { key: 'month', label: 'Bulan' },
  { key: 'range', label: 'Range' },
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
function fmtShort(s) {
  const d = parseLocal(s);
  return `${d.getDate()} ${MONTH_ID[d.getMonth()]}`;
}
function formatLabel(period, dateStr, rangeStart, rangeEnd) {
  if (period === 'range') {
    if (!rangeStart) return 'Pilih rentang';
    if (!rangeEnd)   return `${fmtShort(rangeStart)} – …`;
    return `${fmtShort(rangeStart)} – ${fmtShort(rangeEnd)}`;
  }
  const d = parseLocal(dateStr);
  if (period === 'month') return `${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`;
}
function shiftDate(period, dateStr, dir) {
  const d = parseLocal(dateStr);
  if (period === 'month') d.setMonth(d.getMonth() + dir);
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

function RangeCalendar({ rangeStart, rangeEnd, setRangeStart, setRangeEnd, onClose }) {
  const initD = rangeStart ? parseLocal(rangeStart) : new Date();
  const [vm, setVm] = useState(new Date(initD.getFullYear(), initD.getMonth(), 1));
  const [hover, setHover] = useState(null);
  const picking = rangeStart && !rangeEnd ? 'end' : 'start';
  const today = new Date(); today.setHours(0,0,0,0);
  const cells = buildCells(vm);

  function cellD(cell) { return new Date(vm.getFullYear(), vm.getMonth() + cell.mo, cell.n); }

  function handleClick(cell) {
    const d = cellD(cell); d.setHours(0,0,0,0);
    const ds = toStr(d);
    if (picking === 'start') {
      setRangeStart(ds);
      setRangeEnd('');
    } else {
      const s = parseLocal(rangeStart); s.setHours(0,0,0,0);
      if (d < s) {
        setRangeStart(ds);
        setRangeEnd('');
      } else {
        setRangeEnd(ds);
        onClose();
      }
    }
  }

  function cellCls(cell) {
    const cd = cellD(cell); cd.setHours(0,0,0,0);
    const cls = ['dp-day'];
    if (cell.mo !== 0) cls.push('other');
    if (cd.getTime() === today.getTime()) cls.push('today');

    const s = rangeStart ? parseLocal(rangeStart) : null; if (s) s.setHours(0,0,0,0);
    const e = rangeEnd   ? parseLocal(rangeEnd)   : null; if (e) e.setHours(0,0,0,0);
    const h = (picking === 'end' && hover) ? parseLocal(hover) : null; if (h) h.setHours(0,0,0,0);
    const effectiveEnd = (h && s && h >= s) ? h : e;

    if (s && toStr(cd) === toStr(s)) { cls.push('range-s'); if (!effectiveEnd || toStr(cd) === toStr(effectiveEnd)) cls.push('range-e'); }
    else if (effectiveEnd && toStr(cd) === toStr(effectiveEnd)) cls.push('range-e');
    else if (s && effectiveEnd && cd > s && cd < effectiveEnd) cls.push('in-range');

    return cls.join(' ');
  }

  return (
    <div className="dp-popup dp-range-popup">
      <div className="dp-header">
        <button className="dp-nav" onClick={() => setVm(d => new Date(d.getFullYear()-1, d.getMonth(), 1))}><ChevronsLeft size={12}/></button>
        <button className="dp-nav" onClick={() => setVm(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}><ChevronLeft size={12}/></button>
        <span className="dp-title">{MONTH_ID[vm.getMonth()]} {vm.getFullYear()}</span>
        <button className="dp-nav" onClick={() => setVm(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}><ChevronRight size={12}/></button>
        <button className="dp-nav" onClick={() => setVm(d => new Date(d.getFullYear()+1, d.getMonth(), 1))}><ChevronsRight size={12}/></button>
      </div>
      <div className="dp-range-hint">
        {picking === 'start' ? 'Pilih tanggal mulai' : 'Pilih tanggal selesai'}
      </div>
      <div className="dp-dow-row">{DOW_ID.map(d => <div key={d} className="dp-dow">{d}</div>)}</div>
      <div className="dp-day-grid">
        {cells.map((cell, i) => (
          <button key={i}
            className={cellCls(cell)}
            onClick={() => handleClick(cell)}
            onMouseEnter={() => picking === 'end' && setHover(toStr(cellD(cell)))}
            onMouseLeave={() => setHover(null)}>
            {cell.n}
          </button>
        ))}
      </div>
      <div className="dp-today-row" style={{ display: 'flex', gap: 6 }}>
        <button className="dp-today-btn" style={{ flex: 1 }} onClick={() => {
          setRangeStart(toStr(today)); setRangeEnd('');
        }}>Hari Ini</button>
        <button className="dp-today-btn" style={{ flex: 1 }} onClick={() => {
          const s = new Date(today.getFullYear(), today.getMonth(), 1);
          const e = new Date(today.getFullYear(), today.getMonth()+1, 0);
          setRangeStart(toStr(s)); setRangeEnd(toStr(e)); onClose();
        }}>Bulan Ini</button>
      </div>
    </div>
  );
}

export default function PeriodPicker({ period, setPeriod, refDate, setRefDate, rangeStart, setRangeStart, rangeEnd, setRangeEnd }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const isRange = period === 'range';
  const label = formatLabel(period, refDate, rangeStart, rangeEnd);

  return (
    <div className="period-picker" ref={ref}>
      <select className="pp-select" value={period}
        onChange={e => { setPeriod(e.target.value); setOpen(false); }}>
        {PERIOD_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>

      {!isRange && (
        <button className="pp-nav" onClick={() => setRefDate(shiftDate(period, refDate, -1))} title="Periode sebelumnya">
          <ChevronLeft size={14}/>
        </button>
      )}

      <button className="pp-label" onClick={() => setOpen(v => !v)}>
        <span>{label}</span>
        <CalendarDays size={13} style={{ color: 'var(--muted)', flexShrink: 0 }}/>
      </button>

      {!isRange && (
        <button className="pp-nav" onClick={() => setRefDate(shiftDate(period, refDate, 1))} title="Periode berikutnya">
          <ChevronRight size={14}/>
        </button>
      )}

      {open && (
        period === 'month'
          ? <MonthGrid dateStr={refDate} onChange={d => { setRefDate(d); setOpen(false); }} />
          : period === 'range'
            ? <RangeCalendar
                rangeStart={rangeStart} rangeEnd={rangeEnd}
                setRangeStart={setRangeStart} setRangeEnd={setRangeEnd}
                onClose={() => setOpen(false)} />
            : <DayCalendar dateStr={refDate} onChange={d => { setRefDate(d); setOpen(false); }} />
      )}
    </div>
  );
}

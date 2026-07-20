import { useRef, useState } from 'react';
import { FolderOpen, CheckCircle2 } from 'lucide-react';
import Modal from '../Modal.jsx';
import { useUI } from '../../UIContext.jsx';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../../ToastContext.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { apiSend, apiSendForm } from '../../api.js';

const MODES = {
  workorder: {
    label: 'Data Downtime Mesin',
    columns: 'NO · Tanggal Lapor · Waktu Lapor · Nama Mesin · Problem · Penyelesaian · Tanggal Mulai · Waktu Mulai · Tanggal Selesai · Waktu Selesai · Waktu Pengerjaan · Downtime · Status · PIC MTN',
    notes: 'Delimiter , atau ; atau Tab otomatis terdeteksi. Nama kolom tidak case-sensitive.',
  },
  machines: {
    label: 'Master Data Mesin',
    endpoint: '/import-machines',
    columns: 'NO · Nomor Asset · Nama Mesin · Type · Merk · Tahun Mesin · Daya · Cluster · Line · Shift · Jam Waktu Kerja',
    notes: 'Delimiter , atau ; atau Tab otomatis terdeteksi. Nama kolom tidak case-sensitive.',
  },
};

// Minimal CSV parser — handles quoted fields, auto-detects delimiter
function parseCsvText(text) {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) || '';
  const commas = (firstLine.match(/,/g) || []).length;
  const semis  = (firstLine.match(/;/g) || []).length;
  const tabs   = (firstLine.match(/\t/g) || []).length;
  const delim  = tabs > commas && tabs > semis ? '\t' : semis > commas ? ';' : ',';

  function splitLine(line) {
    const fields = [];
    let field = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"') { if (line[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else if (c === '"') { inQ = true; }
      else if (c === delim) { fields.push(field.trim()); field = ''; }
      else field += c;
    }
    fields.push(field.trim());
    return fields;
  }

  const nonEmpty = text.split(/\r?\n/).filter((l) => l.trim());
  if (nonEmpty.length < 2) return [];
  const headers = splitLine(nonEmpty[0]).map((h) => h.replace(/^"|"$/g, ''));
  return nonEmpty.slice(1).map((line) => {
    const vals = splitLine(line).map((v) => v.replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

function calcDuration(startDateIso, startTimeStr, endDateIso, endTimeStr) {
  if (!startDateIso || !endDateIso || !endTimeStr) return 0;
  const [sh, sm] = (startTimeStr || '00:00').split(':').map(Number);
  const [eh, em] = (endTimeStr || '00:00').split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 0;
  const start = new Date(startDateIso);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(endDateIso);
  end.setHours(eh, em, 0, 0);
  const diffMs = end - start;
  return diffMs > 0 ? Number((diffMs / 3600000).toFixed(2)) : 0;
}

function parseDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export default function ImportModal() {
  const { closeModal, modalPayload } = useUI();
  const { addNotif, loadAll, machines } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const fileInputRef = useRef(null);
  const [mode, setMode] = useState(modalPayload?.mode || 'workorder');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  function pickFile(f) {
    if (!f) return;
    setFile(f);
  }

  async function doImport() {
    if (!file) return;
    setBusy(true);

    if (mode === 'workorder') {
      try {
        const text = await file.text();
        const rows = parseCsvText(text);

        // Build case-insensitive machine name → id map from already-loaded machines list
        const machineMap = new Map();
        machines.forEach((m) => {
          machineMap.set(m.name.toLowerCase().replace(/\s+/g, ' ').trim(), m.id);
        });

        const breakdowns = [];
        const newMachineNames = new Set();

        for (const row of rows) {
          const csvName = String(row['Nama Mesin'] ?? row.machine_name ?? '').trim();
          const cause   = String(row['Problem Identifikasi'] ?? row['Problem'] ?? row.failure_cause ?? '').trim();
          if (!csvName || !cause) continue;

          const key       = csvName.toLowerCase().replace(/\s+/g, ' ').trim();
          const machineId = machineMap.get(key);
          if (!machineId) newMachineNames.add(csvName);

          const startTime  = String(row['Waktu Mulai'] ?? row['Waktu Lapor'] ?? '').trim() || null;
          const endTime    = String(row['Waktu Selesai'] ?? '').trim() || null;
          const reportDate = parseDate(row['Tanggal Lapor']);
          const startDate  = parseDate(row['Tanggal Mulai'] ?? row['Tanggal Lapor']);
          const endDate    = parseDate(row['Tanggal Selesai']);
          const btRaw      = row['Downtime'] ?? row['Breakdown Time'] ?? row['Waktu Pengerjaan'];
          let durationHrs  = 0;
          if (btRaw && !isNaN(parseFloat(btRaw))) durationHrs = parseFloat(btRaw);
          // Auto-calculate if Downtime column is empty/zero but start+end dates are available
          if (durationHrs === 0 && endDate && endTime) {
            const calcDate = startDate ?? reportDate;
            const calcTime = String(row['Waktu Lapor'] ?? startTime ?? '').trim() || '00:00';
            durationHrs = calcDuration(calcDate, calcTime, endDate, endTime);
          }

          const statusRaw = String(row['Status'] ?? '').toLowerCase();
          const status = statusRaw === 'open' ? 'open'
            : ['resolved', 'close', 'closed', 'selesai'].includes(statusRaw) ? 'resolved'
            : (endTime ? 'resolved' : 'open');

          const bd = {
            cause,
            category: String(row['category'] ?? 'Mechanical') || 'Mechanical',
            severity: 'warning',
            status,
            date: startDate ?? reportDate ?? new Date().toISOString(),
            startTime,
            endDate: endDate ?? (endTime ? (startDate ?? reportDate ?? new Date().toISOString()) : null),
            endTime,
            durationHrs: isFinite(durationHrs) ? durationHrs : 0,
            picGh:  String(row['Grup Head Produksi'] ?? row['PIC GH'] ?? '').trim() || null,
            picMtn: String(row['PIC MTN'] ?? row.technician ?? '').trim() || null,
            resolution: String(row['Penyelesaian'] ?? '').trim() || null,
          };
          if (machineId) bd.machineId = machineId;
          else bd.machineName = csvName;

          breakdowns.push(bd);
        }

        const result = await apiSend('/import', 'POST', {
          breakdowns,
          newMachineNames: [...newMachineNames],
        }, logout);

        const dups      = result.duplicates ?? 0;
        const matchInfo = ` · ${result.matchedMachines ?? 0} mesin cocok, ${result.newMachines ?? 0} mesin baru`;
        const dupInfo   = dups > 0 ? ` · ${dups} data duplikat dilewati` : '';
        const color     = dups > 0 && result.imported === 0 ? 'yellow' : 'green';
        showToast(`Import: ${result.imported} baris baru${dupInfo}${matchInfo}`, color);
        if (dups > 0) {
          addNotif(
            `⚠ ${dups} baris data sudah ada di database dan dilewati (duplikat berdasarkan mesin + tanggal + waktu + problem).`,
            'yellow'
          );
        } else {
          addNotif('CSV data imported', 'green');
        }
        closeModal();
        loadAll();
      } catch (err) {
        showToast(err.message || 'Import gagal', 'red');
      }
    } else {
      // Master Data Mesin — still uses file upload
      const formData = new FormData();
      formData.append('file', file);
      try {
        const result = await apiSendForm(MODES[mode].endpoint, formData, logout);
        showToast(`Import berhasil: ${result.imported ?? result.upserted ?? '?'} mesin`, 'green');
        addNotif('CSV data imported', 'green');
        closeModal();
        loadAll();
      } catch (err) {
        showToast(err.message || 'Import gagal — periksa koneksi backend', 'red');
      }
    }

    setBusy(false);
  }

  return (
    <Modal title="Import CSV" onClose={closeModal}>
      <div className="filter-row" style={{ marginBottom: 12 }}>
        {Object.entries(MODES).map(([key, cfg]) => (
          <span key={key} className={'filter-chip' + (mode === key ? ' active' : '')} onClick={() => { setMode(key); setFile(null); }}>{cfg.label}</span>
        ))}
      </div>
      <div
        className={'drop-zone' + (dragOver ? ' drag-over' : '')}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--muted)' }}><FolderOpen size={28} /></div>
        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {file ? <><CheckCircle2 size={14} color="var(--green)" />{file.name}</> : 'Tap to select file'}
        </p>
        <p style={{ fontSize: 11, marginTop: 4 }}>.csv</p>
        <input type="file" ref={fileInputRef} accept=".csv" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files[0])} />
      </div>
      <div style={{ marginTop: 12, background: 'var(--s2)', borderRadius: 8, padding: 11, fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--text)' }}>Required columns:</strong><br />
        <span style={{ fontFamily: 'var(--mono)' }}>{MODES[mode].columns}</span>
        {MODES[mode].notes && (
          <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--green)', fontStyle: 'italic' }}>
            ✓ {MODES[mode].notes}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn primary" disabled={!file || busy} onClick={doImport}>{busy ? 'Importing…' : 'Import'}</button>
      </div>
    </Modal>
  );
}

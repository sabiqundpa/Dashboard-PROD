import { useEffect, useRef } from 'react';
import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';

const SEVERITY_LABEL = { critical: 'Kritis', warning: 'Waspada', info: 'Info' };
const SEVERITY_DOT = { critical: 'red', warning: 'yellow', info: 'blue' };

export default function TodoPanel() {
  const { todoOpen, setTodoOpen, navigate } = useUI();
  const { breakdowns } = useApp();
  const ref = useRef(null);

  const openItems = breakdowns.filter((b) => b.status === 'open');

  useEffect(() => {
    function onClick(e) {
      if (todoOpen && ref.current && !ref.current.contains(e.target) && !e.target.closest('.todo-btn')) {
        setTodoOpen(false);
      }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [todoOpen, setTodoOpen]);

  function goToWorkOrders() {
    setTodoOpen(false);
    navigate('maintenance');
  }

  return (
    <div className={'notif-panel todo-panel' + (todoOpen ? ' show' : '')} ref={ref}>
      <div className="notif-header">
        <span className="notif-title">To-Do · Work Order</span>
        <span className="notif-clear" onClick={goToWorkOrders}>Lihat semua ›</span>
      </div>
      <div className="notif-list">
        {!openItems.length ? (
          <div style={{ padding: 18, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Tidak ada pekerjaan terbuka</div>
        ) : (
          openItems.slice(0, 10).map((b) => (
            <div key={b.id} className="notif-item" onClick={goToWorkOrders}>
              <div className={'notif-dot ' + (SEVERITY_DOT[b.severity] || 'yellow')}></div>
              <div>
                <div className="notif-text"><strong>{b.machine}</strong> — {b.cause}</div>
                <div className="notif-time">{SEVERITY_LABEL[b.severity] || 'Waspada'} · {b.date}{b.start ? ' · ' + b.start : ''}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

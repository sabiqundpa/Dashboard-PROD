import { useEffect } from 'react';
import { Minimize2, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { ThemeProvider } from './ThemeContext.jsx';
import { ToastProvider } from './ToastContext.jsx';
import { AppProvider, useApp } from './AppContext.jsx';
import { UIProvider, useUI } from './UIContext.jsx';
import { TargetsProvider } from './TargetsContext.jsx';
import TargetsModal from './components/TargetsModal.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Machines from './pages/Machines.jsx';
import Maintenance from './pages/Maintenance.jsx';
import Reports from './pages/Reports.jsx';
import Analytics from './pages/Analytics.jsx';
import RMO from './pages/RMO.jsx';
import Topbar from './components/Topbar.jsx';
import AppSidebar from './components/AppSidebar.jsx';
import MobileDrawer from './components/MobileDrawer.jsx';
import BottomNav from './components/BottomNav.jsx';
import NotifPanel from './components/NotifPanel.jsx';
import TodoPanel from './components/TodoPanel.jsx';
import DetailPanel from './components/DetailPanel.jsx';
import WOPanel from './components/WOPanel.jsx';
import ModalRoot from './components/ModalRoot.jsx';

const PAGES = { dashboard: Dashboard, machines: Machines, maintenance: Maintenance, reports: Reports, analytics: Analytics, rmo: RMO };

function Shell() {
  const { page, closeModal, setNotifOpen, closeDetail, closeWODetail, sidebarOpen, presentMode, togglePresentMode } = useUI();
  const { loadAll } = useApp();
  const PageComponent = PAGES[page] || Dashboard;

  useEffect(() => {
    const t = setInterval(() => loadAll(), 30000);
    return () => clearInterval(t);
  }, [loadAll]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') { closeModal(); setNotifOpen(false); closeDetail(); closeWODetail(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeModal, setNotifOpen, closeDetail]);

  return (
    <>
      <div className={`shell${sidebarOpen && !presentMode ? ' sidebar-open' : ''}${presentMode ? ' pres-mode' : ''}`}>
        <Topbar />
        <AppSidebar />
        <main className="content">
          <PageComponent />
        </main>
      </div>
      <BottomNav />
      <MobileDrawer />
      <NotifPanel />
      <TodoPanel />
      <DetailPanel />
      <WOPanel />
      <ModalRoot />
      <TargetsModal />
      {presentMode && (
        <button className="pres-fab" onClick={togglePresentMode} title="Keluar mode layar penuh">
          <Minimize2 size={14} /> Keluar
        </button>
      )}
    </>
  );
}

function RMOShell() {
  const { username, logout } = useAuth();
  const { loadAll } = useApp();

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <div className="shell">
      <div className="topbar" style={{ justifyContent: 'space-between' }}>
        <div className="logo">MTN<span> Dashboard</span></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>{username}</span>
          <button className="btn" style={{ fontSize: 11, padding: '4px 10px', gap: 5 }} onClick={logout}>
            <LogOut size={12} /> Keluar
          </button>
        </div>
      </div>
      <main className="content" style={{ paddingBottom: 24, justifyContent: 'flex-start' }}>
        <RMO />
      </main>
    </div>
  );
}

function AuthGate() {
  const { token, role } = useAuth();
  if (!token) return <Login />;
  return (
    <AppProvider>
      <UIProvider>
        {role === 'produksi' ? <RMOShell /> : <Shell />}
      </UIProvider>
    </AppProvider>
  );
}

export default function App() {
  return (
    <TargetsProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AuthGate />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </TargetsProvider>
  );
}

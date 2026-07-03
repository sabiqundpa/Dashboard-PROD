import { useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { ThemeProvider } from './ThemeContext.jsx';
import { ToastProvider } from './ToastContext.jsx';
import { AppProvider, useApp } from './AppContext.jsx';
import { UIProvider, useUI } from './UIContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Machines from './pages/Machines.jsx';
import Maintenance from './pages/Maintenance.jsx';
import Reports from './pages/Reports.jsx';
import Analytics from './pages/Analytics.jsx';
import Topbar from './components/Topbar.jsx';
import AppSidebar from './components/AppSidebar.jsx';
import MobileDrawer from './components/MobileDrawer.jsx';
import BottomNav from './components/BottomNav.jsx';
import NotifPanel from './components/NotifPanel.jsx';
import TodoPanel from './components/TodoPanel.jsx';
import DetailPanel from './components/DetailPanel.jsx';
import ModalRoot from './components/ModalRoot.jsx';

const PAGES = { dashboard: Dashboard, machines: Machines, maintenance: Maintenance, reports: Reports, analytics: Analytics };

function Shell() {
  const { page, closeModal, setNotifOpen, closeDetail, sidebarOpen } = useUI();
  const { loadAll } = useApp();
  const PageComponent = PAGES[page] || Dashboard;

  useEffect(() => {
    const t = setInterval(() => loadAll(), 30000);
    return () => clearInterval(t);
  }, [loadAll]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') { closeModal(); setNotifOpen(false); closeDetail(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeModal, setNotifOpen, closeDetail]);

  return (
    <>
      <div className={`shell${sidebarOpen ? ' sidebar-open' : ''}`}>
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
      <ModalRoot />
    </>
  );
}

function AuthGate() {
  const { token } = useAuth();
  if (!token) return <Login />;
  return (
    <AppProvider>
      <UIProvider>
        <Shell />
      </UIProvider>
    </AppProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AuthGate />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

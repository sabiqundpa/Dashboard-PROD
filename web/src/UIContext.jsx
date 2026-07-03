import { createContext, useContext, useState, useCallback } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [modalPayload, setModalPayload] = useState(null);
  const [detailMachine, setDetailMachine] = useState(null);

  const navigate = useCallback((p) => {
    setPage(p);
    setDetailMachine(null);
    setDrawerOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), []);
  const toggleNotif = useCallback(() => { setNotifOpen((v) => !v); setTodoOpen(false); }, []);
  const toggleTodo = useCallback(() => { setTodoOpen((v) => !v); setNotifOpen(false); }, []);

  const openModal = useCallback((name, payload = null) => {
    setActiveModal(name);
    setModalPayload(payload);
  }, []);
  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalPayload(null);
  }, []);

  const showDetail = useCallback((name) => setDetailMachine(name), []);
  const closeDetail = useCallback(() => setDetailMachine(null), []);

  return (
    <UIContext.Provider value={{
      page, navigate,
      sidebarOpen, toggleSidebar,
      drawerOpen, toggleDrawer, setDrawerOpen,
      notifOpen, toggleNotif, setNotifOpen,
      todoOpen, toggleTodo, setTodoOpen,
      activeModal, modalPayload, openModal, closeModal,
      detailMachine, showDetail, closeDetail,
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  return useContext(UIContext);
}

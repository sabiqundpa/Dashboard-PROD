import { useUI } from '../UIContext.jsx';
import AddBreakdownModal from './modals/AddBreakdownModal.jsx';
import CloseWOModal from './modals/CloseWOModal.jsx';
import AddMachineModal from './modals/AddMachineModal.jsx';
import EditMachineModal from './modals/EditMachineModal.jsx';
import ImportModal from './modals/ImportModal.jsx';
import ExportWorkOrdersModal from './modals/ExportWorkOrdersModal.jsx';

export default function ModalRoot() {
  const { activeModal, modalPayload } = useUI();

  switch (activeModal) {
    case 'addBreakdown': return <AddBreakdownModal />;
    case 'closeWO': return <CloseWOModal payload={modalPayload} />;
    case 'addMachine': return <AddMachineModal />;
    case 'editMachine': return <EditMachineModal payload={modalPayload} />;
    case 'import': return <ImportModal />;
    case 'exportWorkOrders': return <ExportWorkOrdersModal />;
    default: return null;
  }
}

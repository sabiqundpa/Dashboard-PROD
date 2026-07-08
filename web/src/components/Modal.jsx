import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, fullscreen, headerVariant }) {
  if (fullscreen) {
    const hdrClass = `modal-header fullscreen-header${headerVariant ? ' hv-' + headerVariant : ''}`;
    return (
      <div className="overlay show fullscreen">
        <div className="modal fullscreen">
          <div className={hdrClass}>
            <div className="modal-title">{title}</div>
            <button className="modal-close" onClick={onClose}><X size={24} /></button>
          </div>
          <div className="fullscreen-body">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-drag" onClick={onClose}></div>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

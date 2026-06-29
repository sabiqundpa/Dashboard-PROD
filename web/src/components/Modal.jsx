export default function Modal({ title, onClose, children, fullscreen }) {
  if (fullscreen) {
    return (
      <div className="overlay show fullscreen">
        <div className="modal fullscreen">
          <div className="modal-header fullscreen-header">
            <div className="modal-title">{title}</div>
            <button className="modal-close" onClick={onClose}>×</button>
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
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

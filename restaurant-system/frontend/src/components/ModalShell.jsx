import React from "react";

function ModalShell({ title, description, onClose, footer, children, size = "default" }) {
  return (
    <div className="modal-backdrop-shell" role="presentation" onClick={onClose}>
      <div
        className={`modal-card-shell${size === "wide" ? " modal-card-wide" : ""}${
          size === "compact" ? " modal-card-compact" : ""
        }`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header-row">
          <div className="modal-heading-stack">
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>

          <button type="button" className="ghost-button modal-close-button" onClick={onClose}>
            Dong
          </button>
        </div>

        <div className="modal-body-stack">{children}</div>

        {footer ? <div className="modal-footer-row">{footer}</div> : null}
      </div>
    </div>
  );
}

export default ModalShell;

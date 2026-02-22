'use client';

export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p className="subtitle">{subtitle}</p> : null}
          </div>
          <button className="btn ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        {children}
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

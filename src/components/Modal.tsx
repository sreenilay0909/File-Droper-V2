import '../styles/Modal.css'

interface ModalProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm?: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'confirm' | 'warning'
}

export default function Modal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'OK',
  cancelText = 'Cancel',
  type = 'info'
}: ModalProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm?.()
  }

  const handleCancel = () => {
    onCancel?.()
  }

  return (
    <div className="modal-overlay" onClick={type === 'info' ? handleConfirm : undefined}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-icon ${type}`}>
          {type === 'warning' && '⚠️'}
          {type === 'confirm' && '❓'}
          {type === 'info' && 'ℹ️'}
        </div>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          {type === 'confirm' && (
            <button className="modal-btn modal-btn-cancel" onClick={handleCancel}>
              {cancelText}
            </button>
          )}
          <button className="modal-btn modal-btn-confirm" onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

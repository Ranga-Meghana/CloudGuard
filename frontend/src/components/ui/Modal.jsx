import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const SIZES = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }

export default function Modal({ open, onClose, title, subtitle, size = 'md', children, headerExtra }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="fixed inset-0 animate-fade-in bg-[#03060f]/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`glass relative my-auto w-full ${SIZES[size]} animate-scale-in !rounded-b-none !bg-[#0c1330]/80 sm:!rounded-b-[24px]`}>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0">
            {title && <h2 className="h-display truncate text-lg font-semibold sm:text-xl">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button onClick={onClose} className="icon-btn !h-9 !w-9" aria-label="Close"><X size={18} /></button>
          </div>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

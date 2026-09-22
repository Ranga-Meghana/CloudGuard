import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from '../components/ui/Modal'

const ConfirmContext = createContext(null)
export const useConfirm = () => useContext(ConfirmContext)

/** const confirm = useConfirm();  if (await confirm({ title, message, confirmLabel, tone })) {...} */
export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve
    setOpts(options)
  }), [])

  const close = (result) => {
    resolver.current?.(result)
    setOpts(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!opts} onClose={() => close(false)} size="sm" title={opts?.title}>
        <div className="flex gap-3">
          <div className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${opts?.tone === 'danger' ? 'bg-danger/15 text-danger' : 'bg-accent/15 text-accent'}`}>
            <AlertTriangle size={20} />
          </div>
          <p className="text-sm leading-relaxed text-muted">{opts?.message}</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => close(false)}>Cancel</button>
          <button className={`btn ${opts?.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)}>
            {opts?.confirmLabel || 'Confirm'}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

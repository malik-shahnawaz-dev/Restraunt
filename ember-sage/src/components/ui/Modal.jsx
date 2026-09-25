import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export function Modal({ open, onClose, title, children, size = 'md', hideClose = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-ink/55 backdrop-blur-[3px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Dialog'}
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-panel bg-cream shadow-lift sm:rounded-panel ${sizes[size]}`}
          >
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="absolute top-4 right-4 z-10 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white/90 text-ink shadow-soft transition hover:bg-white hover:rotate-90"
              >
                <X size={17} />
              </button>
            )}
            {typeof title === 'string' ? (
              <h2 className="sr-only">{title}</h2>
            ) : (
              title
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function Drawer({ open, onClose, children, side = 'right', width = 'max-w-md', label = 'Panel' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const from = side === 'right' ? { x: '100%' } : side === 'left' ? { x: '-100%' } : { y: '100%' }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={from}
            animate={{ x: 0, y: 0 }}
            exit={from}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col overflow-hidden rounded-t-panel bg-cream shadow-drawer sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:rounded-none sm:rounded-l-panel ${
              side === 'right' ? width : 'sm:w-auto'
            }`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

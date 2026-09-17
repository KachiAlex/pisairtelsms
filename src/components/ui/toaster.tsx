import React, { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

import { subscribeToToasts, type ToastOptions } from './use-toast'

interface ToastItem extends ToastOptions {
  id: number
}

const TOAST_DURATION_MS = 5000
const MAX_VISIBLE = 5

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const unsubscribe = subscribeToToasts((options) => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { ...options, id }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, TOAST_DURATION_MS)
    })
    return () => { unsubscribe() }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 print:hidden">
      {toasts.map((t) => {
        const destructive = t.variant === 'destructive'
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border p-3 shadow-lg bg-white ${
              destructive ? 'border-red-200' : 'border-gray-200'
            }`}
          >
            {destructive ? (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              {t.title && (
                <p className={`text-sm font-semibold ${destructive ? 'text-red-900' : 'text-gray-900'}`}>
                  {t.title}
                </p>
              )}
              {t.description && (
                <p className={`text-sm mt-0.5 ${destructive ? 'text-red-700' : 'text-gray-600'}`}>
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className="text-gray-400 hover:text-gray-600 shrink-0"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default Toaster

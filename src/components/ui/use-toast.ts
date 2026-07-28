type ToastVariant = 'default' | 'destructive'

export interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
}

const subscribers = new Set<(options: ToastOptions) => void>()

function emitToast(options: ToastOptions) {
  if (subscribers.size === 0) {
    const payload = [options.title, options.description].filter(Boolean).join(' — ')
    if (options.variant === 'destructive') {
      console.error(`[toast] ${payload || 'Destructive toast triggered'}`)
    } else {
      console.info(`[toast] ${payload || 'Toast triggered'}`)
    }
    return
  }

  subscribers.forEach((listener) => listener(options))
}

export function useToast() {
  const toast = (options: ToastOptions) => emitToast(options)
  return { toast }
}

export function subscribeToToasts(listener: (options: ToastOptions) => void) {
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}

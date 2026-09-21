import React, { useState } from 'react'
import { Lightbulb, X } from 'lucide-react'

interface PageHintProps {
  /** Stable identifier — dismissal persists in localStorage under this key. */
  id: string
  title: string
  tips: string[]
}

const storageKey = (id: string) => `page-hint:${id}`

/**
 * Dismissible "how to use this page" banner. Renders a short, concrete tip
 * list the first time a user visits a flow; dismissal persists per browser.
 */
export function PageHint({ id, title, tips }: PageHintProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey(id)) === 'dismissed'
    } catch {
      return false
    }
  })

  if (dismissed) return null

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey(id), 'dismissed')
    } catch { /* storage unavailable — dismiss for this render only */ }
    setDismissed(true)
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">{title}</p>
            <ul className="mt-1.5 space-y-1">
              {tips.map((tip, i) => (
                <li key={i} className="text-sm text-blue-800 flex gap-2">
                  <span className="text-blue-400 shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="text-blue-400 hover:text-blue-600 shrink-0"
          aria-label="Dismiss tip"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
export default PageHint

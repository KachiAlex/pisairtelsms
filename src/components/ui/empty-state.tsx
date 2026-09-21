import React from 'react'
import type { LucideIcon } from 'lucide-react'

import { Button } from './button'

interface EmptyStateAction {
  label: string
  onClick: () => void
  icon?: LucideIcon
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  className?: string
}

/**
 * Friendly empty state for tables and lists — explains *why* it's empty and
 * what to do next instead of leaving a dead-end blank area.
 */
export function EmptyState({ icon: Icon, title, description, action, secondaryAction, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 px-6 text-center ${className}`}>
      <div className="rounded-2xl bg-gray-50 p-4 mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <p className="text-base font-semibold text-gray-900">{title}</p>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
          {action && (
            <Button onClick={action.onClick}>
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4 mr-2" />}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
export default EmptyState

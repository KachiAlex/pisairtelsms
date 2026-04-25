import React, { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Users } from 'lucide-react'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'

export interface SuperAdminAccountFormData {
  fullName: string
  organization: string
  email: string
  password: string
}

interface CreateSuperAdminAccountDialogProps {
  onAccountCreated: (account: SuperAdminAccountFormData) => Promise<void>
  existingAccount?: {
    fullName: string
    organization: string
    email: string
  } | null
}

export function CreateSuperAdminAccountDialog({
  onAccountCreated,
  existingAccount,
}: CreateSuperAdminAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const [formState, setFormState] = useState<SuperAdminAccountFormData>(() => ({
    fullName: '',
    organization: '',
    email: '',
    password: '',
  }))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const hasExistingAccount = Boolean(existingAccount)

  useEffect(() => {
    if (open) {
      setFormState(
        {
          fullName: existingAccount?.fullName ?? '',
          organization: existingAccount?.organization ?? '',
          email: existingAccount?.email ?? '',
          password: '',
        },
      )
      setSuccessMessage('')
      setErrorMessage('')
    }
  }, [open, existingAccount])

  const isFormValid = useMemo(() => {
    return Object.values(formState).every((value) => value.trim().length > 2)
  }, [formState])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isFormValid) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    onAccountCreated(formState)
      .then(() => {
        setSuccessMessage('Super admin account secured in the Scholix cloud.')
        setFormState((prev) => ({ ...prev, password: '' }))
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Unable to save account. Please retry.'
        setErrorMessage(message)
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" className="w-full justify-center text-sm text-blue-600 hover:text-blue-700">
          <Users className="mr-2 h-4 w-4" />
          {hasExistingAccount ? 'Manage super admin account' : 'Create super admin account'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Super admin account</DialogTitle>
          <DialogDescription>
            Provision secure top-level access. Credentials are encrypted and stored in the Scholix cloud before every
            portal login.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="super-admin-full-name">Full name</Label>
              <Input
                id="super-admin-full-name"
                value={formState.fullName}
                onChange={(event) => setFormState((prev) => ({ ...prev, fullName: event.target.value }))}
                placeholder="Adaeze Nwosu"
                required
              />
            </div>
            <div>
              <Label htmlFor="super-admin-organization">Organization</Label>
              <Input
                id="super-admin-organization"
                value={formState.organization}
                onChange={(event) => setFormState((prev) => ({ ...prev, organization: event.target.value }))}
                placeholder="Scholix Platform Ops"
                required
              />
            </div>
            <div>
              <Label htmlFor="super-admin-email">Work email</Label>
              <Input
                id="super-admin-email"
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value.trim() }))}
                placeholder="you@scholix.cloud"
                required
              />
            </div>
            <div>
              <Label htmlFor="super-admin-password">Secure password</Label>
              <Input
                id="super-admin-password"
                type="password"
                value={formState.password}
                onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4" />
              <p>These credentials are encrypted in transit and stored securely via the Scholix platform cluster.</p>
            </div>
          </div>
          {errorMessage && <p className="text-sm font-medium text-red-600">{errorMessage}</p>}
          {successMessage && <p className="text-sm font-medium text-emerald-600">{successMessage}</p>}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? 'Saving...' : hasExistingAccount ? 'Update account' : 'Create account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

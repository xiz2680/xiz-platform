/**
 * CreateProjectDialog — Collects the required project identity and workspace.
 */

import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpen } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRegisterModal } from '@/context/ModalContext'
import { WorkingDirectorySelector } from '@/components/app-shell/input/WorkingDirectorySelector'

export interface CreateProjectDialogInput {
  name: string
  workingDirectory: string
}

export interface CreateProjectValidation {
  nameRequired: boolean
  workingDirectoryRequired: boolean
  canSubmit: boolean
}

/** Pure validation shared by the UI and its focused unit tests. */
export function validateCreateProjectInput(
  name: string,
  workingDirectory: string,
): CreateProjectValidation {
  const nameRequired = name.trim().length === 0
  const workingDirectoryRequired = workingDirectory.trim().length === 0

  return {
    nameRequired,
    workingDirectoryRequired,
    canSubmit: !nameRequired && !workingDirectoryRequired,
  }
}

interface CreateProjectDialogProps {
  open: boolean
  workspaceId?: string
  onCancel: () => void
  /** Called with normalized required fields when the user confirms. */
  onSubmit: (input: CreateProjectDialogInput) => void
}

export function CreateProjectDialog({
  open,
  workspaceId,
  onCancel,
  onSubmit,
}: CreateProjectDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = React.useState('')
  const [workingDirectory, setWorkingDirectory] = React.useState('')
  const [nameTouched, setNameTouched] = React.useState(false)
  const [workingDirectoryTouched, setWorkingDirectoryTouched] = React.useState(false)

  // Register with modal context so X / Cmd+W closes the dialog first
  useRegisterModal(open, onCancel)

  // A cancelled draft must never leak into the next project creation attempt.
  React.useEffect(() => {
    if (open) {
      setName('')
      setWorkingDirectory('')
      setNameTouched(false)
      setWorkingDirectoryTouched(false)
    }
  }, [open])

  const validation = validateCreateProjectInput(name, workingDirectory)

  const handleSubmit = () => {
    setNameTouched(true)
    setWorkingDirectoryTouched(true)
    if (!validation.canSubmit) return
    onSubmit({
      name: name.trim(),
      workingDirectory: workingDirectory.trim(),
    })
  }

  const handleCancel = () => {
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('projectsList.createDialogTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="create-project-name" className="text-sm font-medium">
              {t('projectsList.createDialogNameLabel')}
            </label>
            <Input
              id="create-project-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder={t('projectsList.createDialogNamePlaceholder')}
              aria-invalid={nameTouched && validation.nameRequired}
              aria-describedby={nameTouched && validation.nameRequired ? 'create-project-name-error' : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
            {nameTouched && validation.nameRequired && (
              <p id="create-project-name-error" role="alert" className="text-xs text-destructive">
                {t('projectsList.createDialogNameRequired')}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">
              {t('projectsList.createDialogWorkingDirectoryLabel')}
            </span>
            <WorkingDirectorySelector
              workingDirectory={workingDirectory || undefined}
              onWorkingDirectoryChange={(path) => {
                setWorkingDirectory(path)
                setWorkingDirectoryTouched(true)
              }}
              workspaceId={workspaceId}
              side="bottom"
              renderTrigger={({ workingDirectory: selectedPath }) => (
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-9 w-full justify-start gap-2 px-3 py-2 text-left font-normal"
                  aria-invalid={workingDirectoryTouched && validation.workingDirectoryRequired}
                  aria-describedby={workingDirectoryTouched && validation.workingDirectoryRequired
                    ? 'create-project-working-directory-error'
                    : undefined}
                  onBlur={() => setWorkingDirectoryTouched(true)}
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className={selectedPath ? 'min-w-0 truncate' : 'text-muted-foreground'}>
                    {selectedPath || t('projectsList.createDialogWorkingDirectoryPlaceholder')}
                  </span>
                </Button>
              )}
            />
            {workingDirectoryTouched && validation.workingDirectoryRequired && (
              <p
                id="create-project-working-directory-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {t('projectsList.createDialogWorkingDirectoryRequired')}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!validation.canSubmit} onClick={handleSubmit}>
            {t('projectsList.createButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

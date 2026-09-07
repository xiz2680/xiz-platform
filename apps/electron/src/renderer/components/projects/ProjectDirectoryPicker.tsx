import { useTranslation } from 'react-i18next'
import { FolderOpen, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ServerDirectoryBrowser } from '@/components/ServerDirectoryBrowser'
import { useDirectoryPicker } from '@/hooks/useDirectoryPicker'

export function addProjectDirectory(paths: string[], path: string): string[] {
  const value = path.trim()
  return value && !paths.includes(value) ? [...paths, value] : paths
}

export function ProjectDirectoryPicker({ value, onChange }: { value: string[]; onChange: (paths: string[]) => void }) {
  const { t } = useTranslation()
  const picker = useDirectoryPicker(path => onChange(addProjectDirectory(value, path)))
  return <div className="space-y-2">
    {value.map(path => <div key={path} className="flex min-w-0 items-center gap-2 rounded-md border border-foreground/15 px-3 py-2 text-sm">
      <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate" title={path}>{path}</span>
      <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0" aria-label={`${t('common.remove')} ${path}`} onClick={() => onChange(value.filter(item => item !== path))}><X className="size-3.5" /></Button>
    </div>)}
    <Button type="button" variant="outline" className="w-full justify-start gap-2 font-normal" onClick={picker.pickDirectory}>
      {value.length ? <Plus className="size-4" /> : <FolderOpen className="size-4" />}
      {t(value.length ? 'projectsList.addFolder' : 'projectsList.createDialogWorkingDirectoryPlaceholder')}
    </Button>
    <ServerDirectoryBrowser open={picker.showServerBrowser} mode={picker.serverBrowserMode} onSelect={picker.confirmServerBrowser} onCancel={picker.cancelServerBrowser} initialPath={value.at(-1)} />
  </div>
}

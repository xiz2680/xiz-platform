import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { sessionMetaMapAtom } from '@/atoms/sessions'
import { useAppShellContext } from '@/context/AppShellContext'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { HeaderMenu } from '@/components/ui/HeaderMenu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { SettingsCard, SettingsRow, SettingsSection } from '@/components/settings'
import { navigate, routes } from '@/lib/navigate'
import { getSessionTitle } from '@/utils/session'

export default function ArchivedSettingsPage() {
  const { t } = useTranslation()
  const metas = useAtomValue(sessionMetaMapAtom)
  const { activeWorkspaceId, onUnarchiveSession } = useAppShellContext()
  const sessions = Array.from(metas.values())
    .filter(session => session.workspaceId === activeWorkspaceId && session.isArchived)
    .sort((a, b) => (b.lastMessageAt ?? b.createdAt ?? 0) - (a.lastMessageAt ?? a.createdAt ?? 0))

  return (
    <div className="h-full flex flex-col">
      <PanelHeader title={t('sidebar.archived')} actions={<HeaderMenu route={routes.view.settings('archived')} />} />
      <div className="flex-1 min-h-0 mask-fade-y">
        <ScrollArea className="h-full">
          <div className="px-5 py-7 max-w-3xl mx-auto space-y-8">
            <SettingsSection title={t('sidebar.archived')} description={t('session.noArchivedSessionsDesc')}>
              <SettingsCard divided>
                {sessions.length === 0 ? (
                  <SettingsRow label={t('session.noArchivedSessions')} />
                ) : sessions.map(session => (
                  <SettingsRow key={session.id} label={
                    <button type="button" className="block max-w-full truncate text-left hover:underline" onClick={() => navigate(routes.view.allSessions(session.id), { replacePanels: true })}>
                      {getSessionTitle(session)}
                    </button>
                  }>
                    <Button variant="outline" size="sm" onClick={() => onUnarchiveSession(session.id)}>{t('sessionMenu.unarchive')}</Button>
                  </SettingsRow>
                ))}
              </SettingsCard>
            </SettingsSection>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

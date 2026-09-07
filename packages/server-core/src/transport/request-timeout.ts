import { RPC_CHANNELS } from '@xiz-platform/shared/protocol'
import { CLIENT_OPEN_FILE_DIALOG } from './capabilities'

/** Native folder selection waits for a human, across both RPC hops. */
export function requestTimeoutForChannel(channel: string, defaultMs: number): number {
  return channel === CLIENT_OPEN_FILE_DIALOG || channel === RPC_CHANNELS.dialog.OPEN_FOLDER
    ? Math.max(defaultMs, 10 * 60_000)
    : defaultMs
}

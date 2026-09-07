import { expect, test } from 'bun:test'
import { requestTimeoutForChannel } from '../request-timeout'

test('folder picker allows human interaction on both RPC hops', () => {
  expect(requestTimeoutForChannel('dialog:openFolder', 30_000)).toBe(600_000)
  expect(requestTimeoutForChannel('client:openFileDialog', 30_000)).toBe(600_000)
})

test('ordinary requests keep their timeout and longer overrides are preserved', () => {
  expect(requestTimeoutForChannel('session:list', 30_000)).toBe(30_000)
  expect(requestTimeoutForChannel('dialog:openFolder', 900_000)).toBe(900_000)
})

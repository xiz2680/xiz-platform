import { describe, expect, it, mock } from 'bun:test'

// The picker imports the UI package's browser-only PDF worker. It is irrelevant
// to this pure validation test and unavailable in Bun's test runtime.
mock.module('@/components/app-shell/input/WorkingDirectorySelector', () => ({
  WorkingDirectorySelector: () => null,
}))

const { validateCreateProjectInput } = await import('../CreateProjectDialog')

describe('validateCreateProjectInput', () => {
  it('requires both a project name and a working directory', () => {
    expect(validateCreateProjectInput('', '')).toEqual({
      nameRequired: true,
      workingDirectoryRequired: true,
      canSubmit: false,
    })
  })

  it('rejects whitespace-only names', () => {
    expect(validateCreateProjectInput('   ', '/Users/me/project')).toEqual({
      nameRequired: true,
      workingDirectoryRequired: false,
      canSubmit: false,
    })
  })

  it('rejects whitespace-only working directories', () => {
    expect(validateCreateProjectInput('My Project', '  ')).toEqual({
      nameRequired: false,
      workingDirectoryRequired: true,
      canSubmit: false,
    })
  })

  it('allows creation only when both normalized fields are present', () => {
    expect(validateCreateProjectInput(' My Project ', ' /Users/me/project ')).toEqual({
      nameRequired: false,
      workingDirectoryRequired: false,
      canSubmit: true,
    })
  })
})

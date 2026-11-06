export const emptyTemporaryPasswordState = Object.freeze({
  open: false,
  temporaryPassword: '',
  copied: false,
})

export function temporaryPasswordReducer(state, action) {
  switch (action.type) {
    case 'created':
      return typeof action.temporaryPassword === 'string' && action.temporaryPassword.length > 0
        ? { open: true, temporaryPassword: action.temporaryPassword, copied: false }
        : emptyTemporaryPasswordState
    case 'dismiss':
      return emptyTemporaryPasswordState
    case 'reopen':
      return state.temporaryPassword
        ? { ...state, open: true }
        : emptyTemporaryPasswordState
    case 'copied':
      return state.open && state.temporaryPassword
        ? { ...state, copied: true }
        : state
    case 'failed':
    default:
      return state
  }
}

export async function copyTemporaryPassword(state, clipboard) {
  if (!state.open || !state.temporaryPassword || typeof clipboard?.writeText !== 'function') return false
  await clipboard.writeText(state.temporaryPassword)
  return true
}

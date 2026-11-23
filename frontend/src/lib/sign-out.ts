/**
 * Client side of signing out (ASVS V14.3.1). The server clears what it can with
 * a Clear-Site-Data header; the storage is cleared here as well, because that
 * header never arrives when the request fails (offline, or the session timed out
 * while the server was down) and the user must not be left with the previous
 * session's data on a shared computer.
 */
export function clearClientStorage(): void {
  try {
    window.sessionStorage.clear()
    window.localStorage.clear()
  } catch {
    // Storage blocked (private mode, a policy): nothing was kept there to clear.
  }
}

export async function signOut(): Promise<void> {
  try {
    await fetch("/auth/logout", { method: "POST", credentials: "same-origin" })
  } catch {
    // Offline or the server is down: the local clean-up below still happens.
  } finally {
    clearClientStorage()
  }
}

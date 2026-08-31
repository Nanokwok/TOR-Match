export const FORCE_LIGHT_ATTR = "data-force-light"

export type ThemePreference = "system" | "light" | "dark"
export type ResolvedTheme = "light" | "dark"

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark"
}

export function isAuthPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/signup/")
  )
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light"
  }
  return preference
}

export function applyThemeClass(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved
}

export function setForceLightMode(enabled: boolean) {
  const root = document.documentElement
  if (enabled) {
    root.setAttribute(FORCE_LIGHT_ATTR, "true")
    applyThemeClass("light")
    return
  }

  root.removeAttribute(FORCE_LIGHT_ATTR)
}

export function isForceLightMode() {
  return document.documentElement.getAttribute(FORCE_LIGHT_ATTR) === "true"
}

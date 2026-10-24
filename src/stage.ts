/** Läuft das hier auf der Test-Seite (staging.quaelmich.com)? Dort sieht alles anders aus, damit man es nie verwechselt. */
export const isStaging =
  typeof window !== 'undefined' && window.location.hostname.startsWith('staging.')

/** Test-Seite: eigenes Favicon und "[TEST]" im Tab-Titel */
export function markStagingInBrowserTab() {
  if (!isStaging) return
  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach((link) => link.remove())
  const icon = document.createElement('link')
  icon.rel = 'icon'
  icon.type = 'image/svg+xml'
  icon.href = '/favicon-staging.svg'
  document.head.appendChild(icon)
  document.title = `[TEST] ${document.title}`
}

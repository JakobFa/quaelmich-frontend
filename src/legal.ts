/**
 * Angaben für Impressum und Datenschutzerklärung. Sie kommen beim Bauen aus Umgebungsvariablen
 * (auf Render beim Frontend gesetzt), damit keine persönliche Anschrift im öffentlichen Repo steht.
 */
export const legal = {
  name: (import.meta.env.VITE_IMPRESSUM_NAME ?? '').trim(),
  /** Zeilen durch "|" getrennt, z. B. "c/o Anbieter|Straße 1|12345 Stadt" */
  address: (import.meta.env.VITE_IMPRESSUM_ADRESSE ?? '')
    .split('|')
    .map((line: string) => line.trim())
    .filter(Boolean),
  email: (import.meta.env.VITE_IMPRESSUM_EMAIL ?? '').trim(),
}

/** Das Impressum erscheint erst, wenn Name, Anschrift und E-Mail gesetzt sind */
export const hasImpressum = Boolean(legal.name && legal.address.length > 0 && legal.email)

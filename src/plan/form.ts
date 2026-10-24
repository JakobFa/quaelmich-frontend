/** Was ein Form-Wert (Fitness − Ermüdung) bedeutet – grobe, übliche Bereiche */
export type FormState = { label: string; hint: string }

export function formStateOf(form: number): FormState {
  if (form > 15) {
    return {
      label: 'sehr frisch',
      hint: 'Ausgeruht – bleibt das lange so, geht etwas Fitness verloren.',
    }
  }
  if (form >= 5) return { label: 'frisch', hint: 'Ideal für ein Rennen oder einen Test.' }
  if (form >= -10)
    return { label: 'ausgeglichen', hint: 'Training und Erholung halten sich die Waage.' }
  if (form >= -30) {
    return { label: 'im Aufbau', hint: 'Produktive Ermüdung – so wird man fitter.' }
  }
  return { label: 'überlastet', hint: 'Sehr viel Ermüdung – gönn dir Erholung.' }
}

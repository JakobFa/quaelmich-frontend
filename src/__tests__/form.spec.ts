import { describe, expect, it } from 'vitest'

import { formStateOf } from '../plan/form'

describe('Form', () => {
  it('ordnet Werte in verständliche Bereiche ein', () => {
    expect(formStateOf(20).label).toBe('sehr frisch')
    expect(formStateOf(8).label).toBe('frisch')
    expect(formStateOf(0).label).toBe('ausgeglichen')
    expect(formStateOf(-20).label).toBe('im Aufbau')
    expect(formStateOf(-40).label).toBe('überlastet')
  })
})

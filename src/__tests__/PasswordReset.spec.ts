import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import router from '../router'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import ResetPasswordView from '../views/ResetPasswordView.vue'

function respondWith(status: number) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>(() =>
    Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve({}) }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function mountAt(path: string, component: typeof ForgotPasswordView) {
  await router.push(path)
  await router.isReady()
  return mount(component, { global: { plugins: [router] } })
}

describe('Passwort vergessen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('übernimmt die E-Mail aus der Anmeldung und zeigt danach immer dieselbe Nachricht', async () => {
    const fetchMock = respondWith(202)
    const wrapper = await mountAt('/passwort-vergessen?email=lina@example.com', ForgotPasswordView)

    expect((wrapper.find('input[type=email]').element as HTMLInputElement).value).toBe(
      'lina@example.com',
    )
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(fetchMock.mock.calls[0]![0]).toContain('/auth/password-reset')
    expect(wrapper.text()).toContain('Falls es ein Konto mit lina@example.com gibt')
  })

  it('meldet zu viele Anfragen', async () => {
    respondWith(429)
    const wrapper = await mountAt('/passwort-vergessen', ForgotPasswordView)
    await wrapper.find('input[type=email]').setValue('lina@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Zu viele Anfragen')
  })
})

describe('Neues Passwort setzen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('schickt Token und Passwort und meldet Erfolg', async () => {
    const fetchMock = respondWith(204)
    const wrapper = await mountAt('/passwort-zuruecksetzen?token=abc123', ResetPasswordView)
    const fields = wrapper.findAll('input[type=password]')
    await fields[0]!.setValue('neues-passwort')
    await fields[1]!.setValue('neues-passwort')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))).toEqual({
      token: 'abc123',
      password: 'neues-passwort',
    })
    expect(wrapper.text()).toContain('Geschafft')
  })

  it('erkennt abgelaufene Links', async () => {
    respondWith(400)
    const wrapper = await mountAt('/passwort-zuruecksetzen?token=alt', ResetPasswordView)
    const fields = wrapper.findAll('input[type=password]')
    await fields[0]!.setValue('neues-passwort')
    await fields[1]!.setValue('neues-passwort')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Link ungültig')
  })

  it('ohne Token gibt es gar kein Formular', async () => {
    const wrapper = await mountAt('/passwort-zuruecksetzen', ResetPasswordView)
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('Neuen Link anfordern')
  })
})

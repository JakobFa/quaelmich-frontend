import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import { auth, startSession } from '../auth'
import router from '../router'
import AccountPanel from '../components/AccountPanel.vue'

function respond(status: number) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>(() =>
    Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve({}) }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function openAndConfirm(password: string) {
  const wrapper = mount(AccountPanel, { global: { plugins: [router] } })
  await wrapper.find('.danger .link').trigger('click')
  await wrapper.find('input[type=password]').setValue(password)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  return wrapper
}

describe('Konto löschen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('löscht mit Passwort, meldet ab und geht zur Startseite', async () => {
    startSession('abc.def.ghi', 'lina@example.com')
    const fetchMock = respond(204)

    await openAndConfirm('geheim1234')

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toContain('/me/account/delete')
    expect(JSON.parse(String(init!.body))).toEqual({ password: 'geheim1234' })
    expect(auth.isLoggedIn.value).toBe(false)
    expect(router.currentRoute.value.query.geloescht).toBe('1')
  })

  it('meldet ein falsches Passwort und bleibt angemeldet', async () => {
    startSession('abc.def.ghi', 'lina@example.com')
    respond(403)

    const wrapper = await openAndConfirm('falsch')

    expect(wrapper.text()).toContain('Das Passwort stimmt nicht')
    expect(auth.isLoggedIn.value).toBe(true)
  })
})

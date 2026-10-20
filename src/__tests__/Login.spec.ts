import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import { auth, endSession, startSession } from '../auth'
import router from '../router'
import LoginView from '../views/LoginView.vue'

function respondWith(status: number, body: unknown = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn<() => Promise<unknown>>(() =>
      Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) }),
    ),
  )
}

async function mountLogin(path = '/login') {
  await router.push(path)
  await router.isReady()
  return mount(LoginView, { global: { plugins: [router] } })
}

async function fillAndSubmit(wrapper: Awaited<ReturnType<typeof mountLogin>>) {
  await wrapper.find('input[type=email]').setValue('lina@example.com')
  await wrapper.find('input[type=password]').setValue('geheim1234')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('Login', () => {
  beforeEach(() => endSession())
  afterEach(() => vi.unstubAllGlobals())

  it('speichert nach erfolgreichem Login das Token und leitet zurück', async () => {
    respondWith(200, { token: 'abc.def.ghi', email: 'lina@example.com' })
    const wrapper = await mountLogin('/login?redirect=/profil')

    await fillAndSubmit(wrapper)

    expect(auth.isLoggedIn.value).toBe(true)
    expect(auth.email.value).toBe('lina@example.com')
    expect(router.currentRoute.value.fullPath).toBe('/profil')
  })

  it('zeigt eine Meldung bei falschem Passwort', async () => {
    respondWith(401)
    const wrapper = await mountLogin()

    await fillAndSubmit(wrapper)

    expect(auth.isLoggedIn.value).toBe(false)
    expect(wrapper.text()).toContain('E-Mail oder Passwort stimmt nicht')
  })

  it('weist bei der Registrierung auf ein bestehendes Konto hin', async () => {
    respondWith(409)
    const wrapper = await mountLogin('/login?mode=register')

    await fillAndSubmit(wrapper)

    expect(wrapper.text()).toContain('gibt es schon ein Konto')
  })
})

describe('Routen-Schutz', () => {
  afterEach(() => endSession())

  it('leitet geschützte Seiten ohne Login zur Anmeldung um', async () => {
    endSession()
    await router.push('/plan')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/plan')
  })

  it('lässt angemeldete Nutzer durch', async () => {
    startSession('abc.def.ghi', 'lina@example.com')
    await router.push('/profil')

    expect(router.currentRoute.value.name).toBe('profile')
  })

  it('die Bibliothek ist ohne Login erreichbar', async () => {
    endSession()
    await router.push('/workouts')

    expect(router.currentRoute.value.name).toBe('workouts')
  })
})

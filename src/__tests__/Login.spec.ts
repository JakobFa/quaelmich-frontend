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

/** Füllt das Formular aus; bei der Registrierung auch die Wiederholungsfelder */
async function fillAndSubmit(
  wrapper: Awaited<ReturnType<typeof mountLogin>>,
  { emailRepeat = 'lina@example.com', passwordRepeat = 'geheim1234' } = {},
) {
  const emailFields = wrapper.findAll('input[type=email]')
  await emailFields[0]!.setValue('lina@example.com')
  if (emailFields[1]) await emailFields[1].setValue(emailRepeat)

  const passwordFields = wrapper.findAll('input[type=password]')
  await passwordFields[0]!.setValue('geheim1234')
  if (passwordFields[1]) await passwordFields[1].setValue(passwordRepeat)

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

  it('fragt beim Anmelden nur einmal nach E-Mail und Passwort', async () => {
    const wrapper = await mountLogin()

    expect(wrapper.findAll('input[type=email]')).toHaveLength(1)
    expect(wrapper.findAll('input[type=password]')).toHaveLength(1)
  })

  it('kann das Passwort anzeigen', async () => {
    const wrapper = await mountLogin()

    await wrapper.find('.toggle').trigger('click')

    expect(wrapper.find('.password-row input').attributes('type')).toBe('text')
  })
})

describe('Registrierung', () => {
  beforeEach(() => endSession())
  afterEach(() => vi.unstubAllGlobals())

  it('weist auf ein bestehendes Konto hin', async () => {
    respondWith(409)
    const wrapper = await mountLogin('/login?mode=register')

    await fillAndSubmit(wrapper)

    expect(wrapper.text()).toContain('gibt es schon ein Konto')
  })

  it('stoppt bei einem Tippfehler in der E-Mail', async () => {
    respondWith(201, { token: 'abc.def.ghi', email: 'lina@example.com' })
    const wrapper = await mountLogin('/login?mode=register')

    await fillAndSubmit(wrapper, { emailRepeat: 'lina@exmaple.com' })

    expect(wrapper.text()).toContain('E-Mail-Adressen stimmen nicht überein')
    // nur die Frage nach dem Einladungscode, aber keine Registrierung
    const calls = vi.mocked(fetch).mock.calls.map(([url]) => String(url))
    expect(calls.some((url) => url.endsWith('/auth/register'))).toBe(false)
    expect(auth.isLoggedIn.value).toBe(false)
  })

  it('akzeptiert die E-Mail-Wiederholung mit anderer Groß-/Kleinschreibung', async () => {
    respondWith(201, { token: 'abc.def.ghi', email: 'lina@example.com' })
    const wrapper = await mountLogin('/login?mode=register')

    await fillAndSubmit(wrapper, { emailRepeat: 'Lina@Example.com' })

    expect(auth.isLoggedIn.value).toBe(true)
  })

  it('stoppt bei unterschiedlichen Passwörtern', async () => {
    respondWith(201, { token: 'abc.def.ghi', email: 'lina@example.com' })
    const wrapper = await mountLogin('/login?mode=register')

    await fillAndSubmit(wrapper, { passwordRepeat: 'geheim1243' })

    expect(wrapper.text()).toContain('Passwörter stimmen nicht überein')
    // nur die Frage nach dem Einladungscode, aber keine Registrierung
    const calls = vi.mocked(fetch).mock.calls.map(([url]) => String(url))
    expect(calls.some((url) => url.endsWith('/auth/register'))).toBe(false)
  })
})

describe('Einladungscode', () => {
  beforeEach(() => endSession())
  afterEach(() => vi.unstubAllGlobals())

  it('fragt nach dem Code, wenn das Backend einen verlangt, und schickt ihn mit', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>((url) =>
      Promise.resolve({
        ok: true,
        status: url.endsWith('/auth/registration') ? 200 : 201,
        json: () =>
          Promise.resolve(
            url.endsWith('/auth/registration')
              ? { inviteRequired: true }
              : { token: 'abc.def.ghi', email: 'lina@example.com' },
          ),
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = await mountLogin('/login?mode=register')
    await flushPromises()

    const codeField = wrapper.find('input[autocomplete=off][type=text]')
    expect(codeField.exists()).toBe(true)
    await codeField.setValue('quael-2027')
    await fillAndSubmit(wrapper)

    const registerCall = fetchMock.mock.calls.find(([url]) => url.endsWith('/auth/register'))!
    expect(JSON.parse(String(registerCall[1]!.body)).inviteCode).toBe('quael-2027')
  })

  it('übernimmt den Code aus dem Einladungslink', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<unknown>>(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ inviteRequired: true }),
        }),
      ),
    )
    const wrapper = await mountLogin('/login?mode=register&code=QUAL-7KX4-M9PD')
    await flushPromises()

    const field = wrapper.find('input[autocomplete=off][type=text]').element as HTMLInputElement
    expect(field.value).toBe('QUAL-7KX4-M9PD')
  })

  it('meldet einen falschen Code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<(url: string) => Promise<unknown>>((url) =>
        Promise.resolve({
          ok: url.endsWith('/auth/registration'),
          status: url.endsWith('/auth/registration') ? 200 : 403,
          json: () => Promise.resolve({ inviteRequired: true }),
        }),
      ),
    )
    const wrapper = await mountLogin('/login?mode=register')
    await flushPromises()
    await wrapper.find('input[autocomplete=off][type=text]').setValue('falsch')
    await fillAndSubmit(wrapper)

    expect(wrapper.text()).toContain(
      'Einladungscode stimmt nicht, ist abgelaufen oder wurde schon benutzt',
    )
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

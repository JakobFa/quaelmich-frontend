import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import StravaConnection from '../components/StravaConnection.vue'
import { STRAVA_WRITE_SCOPE, stravaAuthorizeUrl } from '../strava/oauth'
import { emptyAthlete } from '../types/athlete'

/** Antwortet der Reihe nach mit den angegebenen Bodies */
function backend(...bodies: unknown[]) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>(() => {
    const body = bodies.shift() ?? {}
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const base = { clientId: '12345', athleteName: null, connectedAt: null }

describe('StravaConnection', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('ist unsichtbar, solange Strava auf dem Server nicht eingerichtet ist', async () => {
    backend({ ...base, available: false, clientId: null, connected: false })
    const wrapper = mount(StravaConnection)
    await flushPromises()

    expect(wrapper.text()).toBe('')
  })

  it('zeigt den Strava-Button, solange nicht verbunden', async () => {
    backend({ ...base, available: true, connected: false })
    const wrapper = mount(StravaConnection)
    await flushPromises()

    expect(wrapper.find('.strava-button').text()).toBe('Connect with Strava')
    expect(wrapper.text()).toContain('Powered by Strava')
  })

  it('zeigt, mit wem verbunden ist', async () => {
    backend({ ...base, available: true, connected: true, athleteName: 'Jakob' })
    const wrapper = mount(StravaConnection)
    await flushPromises()

    expect(wrapper.text()).toContain('Verbunden als Jakob')
    expect(wrapper.find('.strava-button').exists()).toBe(false)
  })

  it('schlägt Werte aus Strava vor, die vom Profil abweichen, und übernimmt sie', async () => {
    const athlete = { ...emptyAthlete(), ftp: 250, weightKg: 72, maxHeartRate: null }
    const fetchMock = backend(
      { ...base, available: true, connected: true },
      {
        profileAccess: true,
        ftp: 250,
        weightKg: 71.5,
        maxHeartRate: 189,
        maxHeartRateSource: 'ZONES',
      },
      { ...athlete, weightKg: 71.5, maxHeartRate: 189 },
    )
    const wrapper = mount(StravaConnection, { props: { athlete } })
    await flushPromises()

    const rows = wrapper.findAll('tbody tr').map((row) => row.text())
    expect(rows).toHaveLength(2) // FTP ist gleich und wird nicht angeboten
    expect(rows[0]).toContain('71,5 kg')
    expect(rows[1]).toContain('189 bpm')

    await wrapper.find('.suggestion .button').trigger('click')
    await flushPromises()

    const saved = JSON.parse(String(fetchMock.mock.calls[2]![1]!.body))
    expect(saved).toMatchObject({ ftp: 250, weightKg: 71.5, maxHeartRate: 189 })
    expect(wrapper.emitted('athlete-updated')).toHaveLength(1)
  })

  it('sagt Bescheid, wenn alles zu Strava passt', async () => {
    backend(
      { ...base, available: true, connected: true },
      { profileAccess: true, ftp: 250, weightKg: null, maxHeartRate: null },
    )
    const athlete = { ...emptyAthlete(), ftp: 250, weightKg: 72 }
    const wrapper = mount(StravaConnection, { props: { athlete } })
    await flushPromises()

    expect(wrapper.text()).toContain('Dein Profil passt zu Strava')
    expect(wrapper.text()).toContain('Maximalpuls kennt Strava nicht')
  })

  it('bietet eigene Strava-Pulszonen zum Übernehmen an', async () => {
    const athlete = { ...emptyAthlete(), ftp: 250, maxHeartRate: 189 }
    backend(
      { ...base, available: true, connected: true },
      {
        profileAccess: true,
        ftp: 250,
        weightKg: null,
        maxHeartRate: 189,
        maxHeartRateSource: 'ACTIVITIES',
        heartRateZoneStarts: [120, 150, 165, 178],
        customZones: true,
      },
    )
    const wrapper = mount(StravaConnection, { props: { athlete } })
    await flushPromises()

    expect(wrapper.text()).toContain('120 / 150 / 165 / 178')
  })

  it('bittet ohne Profil-Erlaubnis um neues Verbinden', async () => {
    backend(
      { ...base, available: true, connected: true },
      { profileAccess: false, ftp: null, weightKg: null, maxHeartRate: null },
    )
    const wrapper = mount(StravaConnection, { props: { athlete: emptyAthlete() } })
    await flushPromises()

    expect(wrapper.text()).toContain('Neu verbinden')
  })

  it('leitet mit Rücksprung-Adresse und Leserecht zu Strava weiter', () => {
    const url = new URL(stravaAuthorizeUrl('12345', 'https://quaelmich.test', 'zufall'))

    expect(url.origin + url.pathname).toBe('https://www.strava.com/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe('12345')
    expect(url.searchParams.get('redirect_uri')).toBe('https://quaelmich.test/strava/callback')
    expect(url.searchParams.get('scope')).toBe('activity:read_all,profile:read_all')
    expect(url.searchParams.get('state')).toBe('zufall')
  })

  it('fragt die Schreib-Erlaubnis nur für die Strava-Beschreibung an', () => {
    const url = new URL(
      stravaAuthorizeUrl('12345', 'https://quaelmich.test', 'zufall', STRAVA_WRITE_SCOPE),
    )

    expect(url.searchParams.get('scope')).toBe('activity:read_all,profile:read_all,activity:write')
  })

  it('schaltet das Schreiben in die Beschreibung ein, wenn Strava es erlaubt hat', async () => {
    const fetchMock = backend(
      {
        ...base,
        available: true,
        connected: true,
        canWriteActivities: true,
        writeDescriptions: false,
      },
      { profileAccess: true, ftp: null, weightKg: null, maxHeartRate: null },
      {
        ...base,
        available: true,
        connected: true,
        canWriteActivities: true,
        writeDescriptions: true,
      },
    )
    const wrapper = mount(StravaConnection, { props: { athlete: emptyAthlete() } })
    await flushPromises()

    await wrapper.find('.describe-toggle input').setValue(true)
    await flushPromises()

    const [url, init] = fetchMock.mock.calls[2]!
    expect(url).toContain('/me/strava/descriptions')
    expect(init?.method).toBe('PUT')
    expect(init?.body).toBe('{"enabled":true}')
    expect((wrapper.find('.describe-toggle input').element as HTMLInputElement).checked).toBe(true)
  })
})

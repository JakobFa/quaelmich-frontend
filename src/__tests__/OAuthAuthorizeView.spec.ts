import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import OAuthAuthorizeView from '../views/OAuthAuthorizeView.vue'
import type { OAuthClientInfo, OAuthConsent } from '../api'

const query: Record<string, string> = {}
vi.mock('vue-router', () => ({ useRoute: () => ({ query }) }))

const { getOAuthClient, oauthConsent } = vi.hoisted(() => ({
  getOAuthClient: vi.fn<(id: string, uri: string) => Promise<OAuthClientInfo>>(),
  oauthConsent: vi.fn<(consent: OAuthConsent) => Promise<{ redirectUrl: string }>>(),
}))
vi.mock('../api', () => ({ getOAuthClient, oauthConsent }))

const assign = vi.fn<(url: string) => void>()

function setQuery(values: Record<string, string>) {
  Object.keys(query).forEach((key) => delete query[key])
  Object.assign(query, values)
}

const valid = {
  client_id: 'qm_1',
  redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
  code_challenge: 'a'.repeat(43),
  code_challenge_method: 'S256',
  scope: 'plan:read',
  state: 'xyz',
}

describe('OAuthAuthorizeView', () => {
  beforeEach(() => {
    getOAuthClient.mockReset()
    oauthConsent.mockReset()
    assign.mockReset()
    vi.stubGlobal('location', { ...window.location, assign })
    setQuery(valid)
  })

  it('zeigt, wer worauf zugreifen möchte, und wohin zurückgeleitet wird', async () => {
    getOAuthClient.mockResolvedValue({ name: 'Claude', redirectUriRegistered: true, redirectHost: 'claude.ai' })
    const wrapper = mount(OAuthAuthorizeView)
    await flushPromises()

    expect(wrapper.text()).toContain('Claude')
    expect(wrapper.find('[data-test="permissions"]').text()).toContain('lesen')
    expect(wrapper.find('[data-test="host"]').text()).toBe('claude.ai')
  })

  it('erlaubt und leitet mit dem Code zurück zur KI-App', async () => {
    getOAuthClient.mockResolvedValue({ name: 'Claude', redirectUriRegistered: true, redirectHost: 'claude.ai' })
    oauthConsent.mockResolvedValue({ redirectUrl: 'https://claude.ai/api/mcp/auth_callback?code=c&state=xyz' })
    const wrapper = mount(OAuthAuthorizeView)
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text() === 'Erlauben')!.trigger('click')
    await flushPromises()

    expect(oauthConsent).toHaveBeenCalledWith({
      clientId: 'qm_1',
      redirectUri: valid.redirect_uri,
      codeChallenge: valid.code_challenge,
      codeChallengeMethod: 'S256',
      scope: 'plan:read',
      state: 'xyz',
    })
    expect(assign).toHaveBeenCalledWith('https://claude.ai/api/mcp/auth_callback?code=c&state=xyz')
  })

  it('leitet beim Ablehnen mit access_denied zurück', async () => {
    getOAuthClient.mockResolvedValue({ name: 'Claude', redirectUriRegistered: true, redirectHost: 'claude.ai' })
    const wrapper = mount(OAuthAuthorizeView)
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text() === 'Ablehnen')!.trigger('click')

    expect(oauthConsent).not.toHaveBeenCalled()
    const target = new URL(assign.mock.calls[0]![0])
    expect(target.searchParams.get('error')).toBe('access_denied')
    expect(target.searchParams.get('state')).toBe('xyz')
  })

  it('erlaubt nichts bei nicht registrierter Rückleitung, fehlendem PKCE oder unbekanntem Bereich', async () => {
    getOAuthClient.mockResolvedValue({ name: 'Claude', redirectUriRegistered: false, redirectHost: 'boese.example' })
    let wrapper = mount(OAuthAuthorizeView)
    await flushPromises()
    expect(wrapper.findAll('button').some((b) => b.text() === 'Erlauben')).toBe(false)

    getOAuthClient.mockResolvedValue({ name: 'Claude', redirectUriRegistered: true, redirectHost: 'claude.ai' })
    setQuery({ ...valid, code_challenge_method: 'plain' })
    wrapper = mount(OAuthAuthorizeView)
    await flushPromises()
    expect(wrapper.findAll('button').some((b) => b.text() === 'Erlauben')).toBe(false)

    setQuery({ ...valid, scope: 'plan:read alles:loeschen' })
    wrapper = mount(OAuthAuthorizeView)
    await flushPromises()
    expect(wrapper.findAll('button').some((b) => b.text() === 'Erlauben')).toBe(false)
  })

  it('zeigt eine Fehlermeldung bei unbekannter KI-App', async () => {
    getOAuthClient.mockRejectedValue(new Error('404'))
    const wrapper = mount(OAuthAuthorizeView)
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })
})

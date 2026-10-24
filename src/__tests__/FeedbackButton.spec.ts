import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import router from '../router'
import FeedbackButton from '../components/FeedbackButton.vue'

describe('Feedback', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('schickt Text und Seite und bedankt sich', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>(() =>
      Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({}) }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await router.push('/workouts')
    await router.isReady()
    const wrapper = mount(FeedbackButton, { global: { plugins: [router] } })

    await wrapper.find('.toggle').trigger('click')
    await wrapper.find('textarea').setValue('Der Sonntag wirkt zu hart')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toContain('/me/feedback')
    expect(JSON.parse(String(init!.body))).toEqual({
      message: 'Der Sonntag wirkt zu hart',
      page: '/workouts',
    })
    expect(wrapper.text()).toContain('Danke')
  })
})

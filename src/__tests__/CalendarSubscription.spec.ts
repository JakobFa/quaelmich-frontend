import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import CalendarSubscription from '../components/CalendarSubscription.vue'

const api = vi.hoisted(() => ({
  getCalendarSubscription: vi.fn<() => Promise<{ token: string | null }>>(),
  renewCalendarSubscription: vi.fn<() => Promise<{ token: string | null }>>(),
  endCalendarSubscription: vi.fn<() => Promise<void>>(),
  calendarFeedUrl: (token: string, scheme = 'https') =>
    `${scheme}://api.example.test/calendar/${token}.ics`,
}))
vi.mock('../api', () => api)

describe('CalendarSubscription', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => typeof fn === 'function' && 'mockReset' in fn && fn.mockReset())
  })

  it('bietet ohne Abo an, einen Link zu erstellen, und zeigt ihn danach an', async () => {
    api.getCalendarSubscription.mockResolvedValue({ token: null })
    api.renewCalendarSubscription.mockResolvedValue({ token: 'abc123' })
    const wrapper = mount(CalendarSubscription)
    await flushPromises()

    await wrapper.find('button.button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="feed-url"]').text()).toBe(
      'https://api.example.test/calendar/abc123.ics',
    )
    expect(wrapper.find('a.button').attributes('href')).toBe(
      'webcal://api.example.test/calendar/abc123.ics',
    )
  })

  it('beendet das Abo', async () => {
    api.getCalendarSubscription.mockResolvedValue({ token: 'abc123' })
    api.endCalendarSubscription.mockResolvedValue()
    const wrapper = mount(CalendarSubscription)
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text() === 'Abo beenden')!.trigger('click')
    await flushPromises()

    expect(api.endCalendarSubscription).toHaveBeenCalled()
    expect(wrapper.find('[data-test="feed-url"]').exists()).toBe(false)
  })

  it('erzeugt auf Wunsch einen neuen Link', async () => {
    api.getCalendarSubscription.mockResolvedValue({ token: 'old' })
    api.renewCalendarSubscription.mockResolvedValue({ token: 'new' })
    const wrapper = mount(CalendarSubscription)
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text() === 'Neuen Link erzeugen')!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="feed-url"]').text()).toContain('/new.ics')
  })
})

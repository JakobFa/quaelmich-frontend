import { describe, it, expect, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  it('mounts renders properly', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })))
    const wrapper = mount(App)
    expect(wrapper.find('img.logo').attributes('alt')).toBe('quaelmich')
  })
})

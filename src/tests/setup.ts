import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'

import * as axeMatchers from 'vitest-axe/matchers'

import { afterEach, expect } from 'vitest'

expect.extend(axeMatchers)

afterEach(() => {
  cleanup()
})

// jsdom não implementa matchMedia / ResizeObserver (usados por Recharts e layout).

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,

      media: query,

      onchange: null,

      addEventListener: () => {},

      removeEventListener: () => {},

      addListener: () => {},

      removeListener: () => {},

      dispatchEvent: () => false,
    }) as MediaQueryList
}

if (!('ResizeObserver' in window)) {
  class ResizeObserverStub {
    observe() {}

    unobserve() {}

    disconnect() {}
  }

  ;(window as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub
}

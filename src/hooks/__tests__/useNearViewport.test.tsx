/** @jest-environment jsdom */
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import useNearViewport from '../useNearViewport'

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  callback: IntersectionObserverCallback
  observe = jest.fn()
  disconnect = jest.fn()

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
}

beforeEach(() => {
  MockIntersectionObserver.instances = []
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    value: MockIntersectionObserver,
  })
})

it('keeps offscreen elements idle, preloads near the viewport and disconnects on unmount', () => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let result: ReturnType<typeof useNearViewport<HTMLDivElement>>
  function Probe() {
    result = useNearViewport<HTMLDivElement>()
    return <div ref={result.ref} />
  }

  act(() => root.render(<Probe />))
  expect(result!.isNearViewport).toBe(false)
  const observer = MockIntersectionObserver.instances[0]
  expect(observer.observe).toHaveBeenCalledWith(container.firstChild)
  expect(result!.isNearViewport).toBe(false)

  act(() => observer.trigger(true))
  expect(result!.isNearViewport).toBe(true)

  act(() => observer.trigger(false))
  expect(result!.isNearViewport).toBe(false)

  act(() => root.unmount())
  expect(observer.disconnect).toHaveBeenCalledTimes(1)
  container.remove()
})

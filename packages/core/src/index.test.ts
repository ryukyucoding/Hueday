import { describe, expect, it } from 'vitest'
import { hello } from './index'

describe('core', () => {
  it('hello', () => {
    expect(hello()).toBe('hueday')
  })
})

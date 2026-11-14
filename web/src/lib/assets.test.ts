import { describe, expect, it } from 'vitest'
import { asset } from './assets'

describe('asset', () => {
  it('antepone la base del sitio y no duplica la barra', () => {
    const base = import.meta.env.BASE_URL
    expect(asset('data/x.json')).toBe(`${base}data/x.json`)
    expect(asset('/data/x.json')).toBe(`${base}data/x.json`)
  })
})

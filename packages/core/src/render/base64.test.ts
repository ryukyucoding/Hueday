import { describe, expect, it } from 'vitest'
import { base64Ascii } from './base64'
import { uniqueChars } from './text'

describe('base64Ascii', () => {
  it('與標準 base64 一致（含各種長度的補 = 情況）', () => {
    // 預先用標準實作算好的答案（core 不引入 Node 的 Buffer，保持與執行環境無關）
    const cases: [string, string][] = [
      ['', ''],
      ['a', 'YQ=='],
      ['ab', 'YWI='],
      ['abc', 'YWJj'],
      ['abcd', 'YWJjZA=='],
      ['Hello, World!', 'SGVsbG8sIFdvcmxkIQ=='],
      ['<svg xmlns="http://www.w3.org/2000/svg"/>', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='],
      ['\u007f\u0000~', 'fwB+']
    ]
    for (const [input, expected] of cases) expect(base64Ascii(input)).toBe(expected)
  })
  it('非 ASCII 會丟錯（SVG 內文必須是純 ASCII，否則 data URI 會壞）', () => {
    expect(() => base64Ascii('拾色')).toThrow()
  })
})

describe('uniqueChars（字型子集的 key 前後端必須一致）', () => {
  it('去重、排序、補空白，且與字元順序無關', () => {
    expect(uniqueChars('拾aab拾')).toBe(' ab拾')
    expect(uniqueChars('色拾')).toBe(uniqueChars('拾色'))
    expect(uniqueChars('')).toBe(' ')
  })
  it('以「字」計（罕用字不會被拆成兩半）', () => {
    expect(Array.from(uniqueChars('𠮷𠮷')).length).toBe(2) // 𠮷 + 空白
  })
})

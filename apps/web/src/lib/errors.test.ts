import { describe, expect, it } from 'vitest'
import { ApiError, aiWarningMessage, friendlyMessage, isNetworkError, toApiError } from './errors'
import { hideToast, showError, showToast, toast } from './toast'

describe('toApiError', () => {
  it('解析統一格式與 Retry-After', async () => {
    const res = new Response(JSON.stringify({ error: { code: 'rate_limited', message: 'x' } }), { status: 429, headers: { 'Retry-After': '30' } })
    const e = await toApiError(res)
    expect(e).toMatchObject({ status: 429, code: 'rate_limited', retryAfter: 30 })
  })
  it('不是 JSON 時也不會丟錯', async () => {
    const e = await toApiError(new Response('<html>bad gateway</html>', { status: 502 }))
    expect(e).toMatchObject({ status: 502, code: 'unknown' })
    expect(e.retryAfter).toBeUndefined()
  })
})

describe('friendlyMessage', () => {
  it('離線 / 網路錯誤', () => {
    expect(isNetworkError(new ApiError(0, 'network', 'x'))).toBe(true)
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isNetworkError(new ApiError(500, 'x', 'x'))).toBe(false)
    expect(friendlyMessage(new ApiError(0, 'network', 'x'), 'upload')).toBe('目前沒有網路，連上網路後再試一次')
  })
  it('413 / 415 / 429（含秒數）', () => {
    expect(friendlyMessage(new ApiError(413, 'too_large', 'x'), 'upload')).toContain('10 MB')
    expect(friendlyMessage(new ApiError(415, 'bad_type', 'x'), 'upload')).toContain('圖片')
    expect(friendlyMessage(new ApiError(429, 'rate_limited', 'x', 30))).toBe('操作太頻繁了，請 30 秒後再試')
    expect(friendlyMessage(new ApiError(429, 'rate_limited', 'x'))).toBe('操作太頻繁了，請稍後再試')
  })
  it('產圖失敗與各情境的預設訊息', () => {
    expect(friendlyMessage(new ApiError(500, 'render_failed', 'x'), 'load')).toContain('圖片暫時產生不出來')
    expect(friendlyMessage(new ApiError(500, 'font_failed', 'x'), 'load')).toContain('圖片暫時產生不出來')
    expect(friendlyMessage(new ApiError(500, 'internal_error', 'x'), 'upload')).toBe('上傳失敗，請再試一次')
    expect(friendlyMessage(new ApiError(500, 'internal_error', 'x'), 'save')).toBe('儲存失敗，請再試一次')
    expect(friendlyMessage(new Error('boom'), 'render')).toContain('圖片暫時產生不出來')
  })
  it('絕不露出內部訊息、錯誤碼或英文 stack', () => {
    for (const e of [new ApiError(500, 'internal_error', 'TypeError: cannot read x'), new Error('ECONNRESET'), 'string error', null]) {
      const m = friendlyMessage(e, 'load')
      expect(m).not.toMatch(/TypeError|ECONN|internal_error|undefined|null/)
      expect(m).toMatch(/[一-鿿]/)
    }
  })
})

describe('aiWarningMessage', () => {
  it('依嚴重度挑訊息；沒有警告回 null', () => {
    expect(aiWarningMessage([])).toBeNull()
    expect(aiWarningMessage(undefined)).toBeNull()
    expect(aiWarningMessage(['ai_error'])).toContain('暫時無法使用')
    expect(aiWarningMessage(['ai_error', 'ai_timeout'])).toContain('太慢')
    expect(aiWarningMessage(['ai_timeout', 'ai_quota'])).toContain('額度')
    expect(aiWarningMessage(['ai_rate_limited'])).toContain('太頻繁')
    expect(aiWarningMessage(['something_else'])).toBeNull()
  })
})

describe('toast', () => {
  it('一般提示與可重試的錯誤提示', () => {
    showToast('已儲存')
    expect(toast).toMatchObject({ message: '已儲存', kind: 'info', action: undefined })
    let n = 0
    showError('上傳失敗', () => n++)
    expect(toast.kind).toBe('error')
    expect(toast.action?.label).toBe('重試')
    toast.action!.run()
    expect(n).toBe(1)
    showError('沒有重試的錯誤')
    expect(toast.action).toBeUndefined()
    hideToast()
    expect(toast.message).toBe('')
  })
})

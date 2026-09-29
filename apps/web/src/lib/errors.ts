/** API 回傳的統一錯誤 { error: { code, message } }；status 0 代表根本連不上（離線 / 網路錯誤） */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function toApiError(res: Response): Promise<ApiError> {
  let code = 'unknown'
  let message = `HTTP ${res.status}`
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    if (body.error?.code) code = body.error.code
    if (body.error?.message) message = body.error.message
  } catch {
    /* 不是 JSON（例如代理層的錯誤頁） */
  }
  const ra = Number(res.headers.get('Retry-After'))
  return new ApiError(res.status, code, message, Number.isFinite(ra) && ra > 0 ? ra : undefined)
}

export const isNetworkError = (e: unknown): boolean => (e instanceof ApiError && e.status === 0) || e instanceof TypeError

export type ErrorContext = 'upload' | 'render' | 'load' | 'save'

const FALLBACK: Record<ErrorContext, string> = {
  upload: '上傳失敗，請再試一次',
  render: '圖片暫時產生不出來，請再試一次',
  load: '暫時載入不了，請再試一次',
  save: '儲存失敗，請再試一次'
}

/** 把任何錯誤轉成給使用者看的友善中文（不會露出內部訊息或錯誤碼） */
export function friendlyMessage(e: unknown, ctx: ErrorContext = 'load'): string {
  if (isNetworkError(e)) return '目前沒有網路，連上網路後再試一次'
  if (e instanceof ApiError) {
    if (e.status === 413) return '照片太大了（上限 10 MB），換一張小一點的吧'
    if (e.status === 415) return '只能上傳圖片喔'
    if (e.status === 429) return e.retryAfter ? `操作太頻繁了，請 ${e.retryAfter} 秒後再試` : '操作太頻繁了，請稍後再試'
    if (e.code === 'render_failed' || e.code === 'font_failed') return FALLBACK.render
  }
  return FALLBACK[ctx]
}

/** 上傳成功但 AI 暫時失敗時（API 的 warnings）：額度用完 > 逾時 > 其他。沒有警告回傳 null。 */
export function aiWarningMessage(warnings: string[] | undefined | null): string | null {
  if (!warnings?.length) return null
  if (warnings.includes('ai_quota')) return 'AI 的額度暫時用完了，先用示意結果，稍後再試'
  if (warnings.includes('ai_timeout')) return 'AI 回應太慢，先用示意結果'
  if (warnings.some((w) => w.startsWith('ai_'))) return 'AI 暫時無法使用，先用示意結果'
  return null
}

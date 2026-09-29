export type Bindings = {
  DB: D1Database
  PHOTOS: R2Bucket
  CACHE: KVNamespace
  GEMINI_MODEL: string
  GEMINI_API_KEY?: string
  /** 只在本地開發設定（wrangler dev --var ALLOW_SIMULATE:1）：允許用 X-Simulate header 模擬各種錯誤 */
  ALLOW_SIMULATE?: string
}

export type Variables = { userId: string }

export type AppEnv = { Bindings: Bindings; Variables: Variables }

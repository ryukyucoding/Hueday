export type Bindings = {
  DB: D1Database
  PHOTOS: R2Bucket
  CACHE: KVNamespace
  GEMINI_MODEL: string
  GEMINI_API_KEY?: string
}

export type Variables = { userId: string }

export type AppEnv = { Bindings: Bindings; Variables: Variables }

/**
 * 照片存放在 KV（沿用 CACHE 這個 namespace，key 以 photo: 開頭），而不是 R2：
 * R2 需要在 Cloudflare 帳號綁付款方式才能啟用，KV 不用，而且可以直接存二進位（單筆上限 25 MiB）。
 * （D1 的 BLOB 讀出來會變成一大串數字陣列，很吃 CPU，免費方案撐不住，所以不用 D1。）
 * photos 資料表的 r2_key 欄位是沿用的舊名稱，現在存的是這個 KV key。
 * 免費方案的 KV 限制：儲存 1 GB、每天 1,000 次寫入（上傳一張照片約 2–4 次寫入）、每天 10 萬次讀取。
 */
export const photoKey = (userId: string, date: string, photoId: string) => `photo:${userId}:${date}:${photoId}`

export async function putPhoto(kv: KVNamespace, key: string, data: ArrayBuffer, contentType: string): Promise<void> {
  await kv.put(key, data, { metadata: { contentType } })
}

export async function getPhoto(kv: KVNamespace, key: string): Promise<{ body: ReadableStream; contentType: string } | null> {
  const r = await kv.getWithMetadata<{ contentType?: string }>(key, { type: 'stream' })
  if (!r.value) return null
  return { body: r.value, contentType: r.metadata?.contentType ?? 'image/jpeg' }
}

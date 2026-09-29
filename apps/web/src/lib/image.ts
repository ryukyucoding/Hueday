import { extractDominantColors } from '@hueday/core'

export const MAX_EDGE = 1600
export const JPEG_QUALITY = 0.85

export function fitWithin(w: number, h: number, maxEdge = MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(w, h))
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

/** 壓縮到長邊 1600px、JPEG 0.85。瀏覽器無法解碼時（例如非 Safari 的 HEIC）回傳原檔。 */
export async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const { width, height } = fitWithin(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', JPEG_QUALITY))
    return blob ?? file
  } catch {
    return file
  }
}

/** 縮到 64×64 取像素後交給 core 抽出主色；失敗回傳空陣列 */
export async function sampleDominantColors(blob: Blob): Promise<string[]> {
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return []
    ctx.drawImage(bitmap, 0, 0, 64, 64)
    bitmap.close()
    return extractDominantColors(ctx.getImageData(0, 0, 64, 64).data, 5)
  } catch {
    return []
  }
}

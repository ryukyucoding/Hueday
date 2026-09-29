export type ShareResult = 'shared' | 'downloaded' | 'cancelled'

export type ShareEnv = {
  nav: Pick<Navigator, 'canShare' | 'share'> | { canShare?: undefined; share?: undefined }
  download: (blob: Blob, filename: string) => void
}

export function shareFilename(date: string): string {
  return `hueday-${date}.png`
}

export function browserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** 能分享檔案就開系統分享（使用者可選 Instagram），否則下載 PNG。以 feature detection 判斷。 */
export async function shareOrDownload(
  blob: Blob,
  filename: string,
  env: ShareEnv = { nav: navigator, download: browserDownload }
): Promise<ShareResult> {
  const file = new File([blob], filename, { type: blob.type || 'image/png' })
  const { nav } = env
  if (typeof nav.canShare === 'function' && typeof nav.share === 'function' && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file] })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // 分享失敗（例如權限被拒）→ 退回下載
    }
  }
  env.download(blob, filename)
  return 'downloaded'
}

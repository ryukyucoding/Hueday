import { describe, expect, it, vi } from 'vitest'
import { shareFilename, shareOrDownload } from './share'

const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })

describe('shareOrDownload', () => {
  it('檔名格式', () => {
    expect(shareFilename('2025-05-01')).toBe('hueday-2025-05-01.png')
  })

  it('支援檔案分享時走 Web Share，且帶 File', async () => {
    const share = vi.fn(async () => {})
    const download = vi.fn()
    const r = await shareOrDownload(blob, 'a.png', { nav: { canShare: () => true, share }, download })
    expect(r).toBe('shared')
    expect(download).not.toHaveBeenCalled()
    const arg = (share.mock.calls[0] as unknown[])[0] as { files: File[] }
    expect(arg.files[0]).toBeInstanceOf(File)
    expect(arg.files[0].name).toBe('a.png')
    expect(arg.files[0].type).toBe('image/png')
  })

  it('沒有 navigator.share（桌面瀏覽器）走下載', async () => {
    const download = vi.fn()
    expect(await shareOrDownload(blob, 'a.png', { nav: {}, download })).toBe('downloaded')
    expect(download).toHaveBeenCalledWith(blob, 'a.png')
  })

  it('canShare 不支援檔案時走下載', async () => {
    const download = vi.fn()
    const share = vi.fn()
    expect(await shareOrDownload(blob, 'a.png', { nav: { canShare: () => false, share }, download })).toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
    expect(download).toHaveBeenCalledOnce()
  })

  it('使用者取消分享不下載也不當成錯誤', async () => {
    const download = vi.fn()
    const share = vi.fn(async () => {
      throw new DOMException('cancel', 'AbortError')
    })
    expect(await shareOrDownload(blob, 'a.png', { nav: { canShare: () => true, share }, download })).toBe('cancelled')
    expect(download).not.toHaveBeenCalled()
  })

  it('分享丟出其他錯誤時退回下載', async () => {
    const download = vi.fn()
    const share = vi.fn(async () => {
      throw new DOMException('denied', 'NotAllowedError')
    })
    expect(await shareOrDownload(blob, 'a.png', { nav: { canShare: () => true, share }, download })).toBe('downloaded')
    expect(download).toHaveBeenCalledOnce()
  })
})

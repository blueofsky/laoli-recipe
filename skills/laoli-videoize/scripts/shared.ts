/**
 * 共享工具函数（供 providers 复用）
 */

export function isNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  const networkMarkers = ["fetch failed", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "network", "socket"]
  return networkMarkers.some((m) => msg.toLowerCase().includes(m.toLowerCase()))
}

export async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`视频下载失败: ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

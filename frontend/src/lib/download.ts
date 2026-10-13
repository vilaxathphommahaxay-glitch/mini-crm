/** Save a Blob as a file in the browser. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // give the browser a moment to start the download before releasing the URL
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** filename="contacts-2026-10-14.csv" from a Content-Disposition header. */
export function filenameFrom(header: string | null, fallback: string): string {
  const match = header && /filename="?([^";]+)"?/i.exec(header)
  return match ? match[1] : fallback
}

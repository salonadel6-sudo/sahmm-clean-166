export function getImageFileName(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return ""

  const path = trimmed.split(/[?#]/, 1)[0].replace(/\/+$/, "")
  const encodedFileName = path.split("/").pop() || trimmed
  try {
    return decodeURIComponent(encodedFileName)
  } catch {
    return encodedFileName
  }
}

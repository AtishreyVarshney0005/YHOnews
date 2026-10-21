export async function readApiResponse(response, fallbackMessage) {
  const text = await response.text()
  let data

  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`${fallbackMessage} (server returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}).`)
  }

  if (!response.ok) throw new Error(data.message || `${fallbackMessage} (HTTP ${response.status}).`)
  return data
}

const hindiTranslationCache = new Map()

function splitTranslationText(text) {
  const chunks = []
  let remaining = text.trim()

  while (Buffer.byteLength(remaining, 'utf8') > 450) {
    let boundary = 0
    let byteLength = 0
    for (const character of remaining) {
      const characterBytes = Buffer.byteLength(character, 'utf8')
      if (byteLength + characterBytes > 450) break
      byteLength += characterBytes
      boundary += character.length
    }

    const safeBoundary = remaining.lastIndexOf(' ', boundary)
    if (safeBoundary > 0) boundary = safeBoundary
    chunks.push(remaining.slice(0, boundary).trim())
    remaining = remaining.slice(boundary).trim()
  }

  if (remaining) chunks.push(remaining)
  return chunks
}

async function translateTextToHindi(text) {
  if (hindiTranslationCache.has(text)) return hindiTranslationCache.get(text)

  const params = new URLSearchParams({ q: text, langpair: 'en|hi' })
  if (process.env.MYMEMORY_EMAIL) params.set('de', process.env.MYMEMORY_EMAIL.trim())
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal: controller.signal })
    if (!response.ok) throw new Error('Translation service returned an unsuccessful response.')

    const payload = await response.json()
    const translated = payload.responseStatus === 200 ? payload.responseData?.translatedText || '' : ''
    if (!translated) throw new Error('Translation service returned an empty response.')

    if (hindiTranslationCache.size >= 300) {
      hindiTranslationCache.delete(hindiTranslationCache.keys().next().value)
    }
    hindiTranslationCache.set(text, translated)
    return translated
  } catch (error) {
    throw Object.assign(new Error('Hindi translation service is temporarily unavailable.', { cause: error }), { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}

export async function translateTextsToHindi(texts) {
  if (
    !Array.isArray(texts)
    || !texts.length
    || texts.length > 80
    || texts.some((text) => typeof text !== 'string' || !text.trim() || text.length > 4000)
    || texts.reduce((total, text) => total + text.length, 0) > 24000
  ) {
    throw Object.assign(new Error('Article text is too long to translate.'), { status: 400 })
  }

  const translations = new Array(texts.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(3, texts.length) }, async () => {
    while (nextIndex < texts.length) {
      const index = nextIndex++
      const chunks = splitTranslationText(texts[index])
      const translatedChunks = []
      for (const chunk of chunks) translatedChunks.push(await translateTextToHindi(chunk))
      translations[index] = translatedChunks.join(' ')
    }
  })

  await Promise.all(workers)
  return translations
}

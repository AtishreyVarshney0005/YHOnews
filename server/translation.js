const hindiTranslationCache = new Map()

async function fetchTranslationResponse(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error('Translation provider returned an unsuccessful response.')
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

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

  try {
    let translated = ''
    try {
      const params = new URLSearchParams({ q: text, langpair: 'en|hi' })
      if (process.env.MYMEMORY_EMAIL) params.set('de', process.env.MYMEMORY_EMAIL.trim())
      const payload = await fetchTranslationResponse(`https://api.mymemory.translated.net/get?${params}`)
      translated = payload.responseStatus === 200 ? payload.responseData?.translatedText || '' : ''
    } catch {
      translated = ''
    }

    if (!translated) {
      const params = new URLSearchParams({ client: 'gtx', sl: 'auto', tl: 'hi', dt: 't', q: text })
      const payload = await fetchTranslationResponse(`https://translate.googleapis.com/translate_a/single?${params}`)
      translated = Array.isArray(payload?.[0])
        ? payload[0].map((segment) => Array.isArray(segment) ? segment[0] || '' : '').join('')
        : ''
    }

    if (!translated.trim()) throw new Error('Hindi translation providers returned an empty response.')

    if (hindiTranslationCache.size >= 300) {
      hindiTranslationCache.delete(hindiTranslationCache.keys().next().value)
    }
    hindiTranslationCache.set(text, translated)
    return translated
  } catch (error) {
    throw Object.assign(new Error('Hindi translation service is temporarily unavailable.', { cause: error }), { status: 502 })
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

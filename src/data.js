export const img = (seed, width = 600, height = 400) => `https://picsum.photos/seed/${seed}/${width}/${height}`
export const CATEGORIES = ['India', 'World', 'Politics', 'Business', 'Technology', 'Sports', 'Entertainment', 'Education', 'Health', 'Lifestyle']
export const slugify = (category) => category.toLowerCase()

const ARTICLE_CONTENT_TAGS = new Set(['A', 'B', 'BLOCKQUOTE', 'BR', 'DIV', 'EM', 'H2', 'H3', 'I', 'LI', 'OL', 'P', 'S', 'STRIKE', 'STRONG', 'U', 'UL'])
const BLOCKED_CONTENT_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'])

export function sanitizeArticleContent(content) {
  const parsed = new DOMParser().parseFromString(String(content || ''), 'text/html')
  const safeContent = document.createElement('div')

  const copySafeNodes = (source, target) => {
    source.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        target.append(document.createTextNode(node.textContent || ''))
        return
      }
      if (node.nodeType !== Node.ELEMENT_NODE || BLOCKED_CONTENT_TAGS.has(node.tagName)) return
      if (!ARTICLE_CONTENT_TAGS.has(node.tagName)) {
        copySafeNodes(node, target)
        return
      }

      const safeNode = document.createElement(node.tagName.toLowerCase())
      if (node.tagName === 'A') {
        const href = node.getAttribute('href')
        if (href) {
          try {
            const url = new URL(href, window.location.origin)
            if (['http:', 'https:', 'mailto:'].includes(url.protocol)) safeNode.setAttribute('href', url.href)
          } catch {
            // Ignore malformed link URLs.
          }
        }
      }
      const textAlign = node.style.textAlign
      if (['left', 'center', 'right', 'justify'].includes(textAlign)) safeNode.style.textAlign = textAlign
      copySafeNodes(node, safeNode)
      target.append(safeNode)
    })
  }

  copySafeNodes(parsed.body, safeContent)
  return safeContent.innerHTML
}

export const NEWS_DATE_RANGES = [
  { value: 'latest', label: 'Latest' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '15days', label: 'Last 15 Days' },
  { value: 'month', label: 'Last 30 Days' },
]

const indiaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Asia/Kolkata',
})

export function normalizeNewsDateRange(value) {
  return NEWS_DATE_RANGES.some((range) => range.value === value) ? value : 'latest'
}

function dateInIndia(timestamp) {
  const parts = Object.fromEntries(indiaDateFormatter.formatToParts(new Date(timestamp)).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

function indiaDateOrdinal(timestamp) {
  const [year, month, day] = dateInIndia(timestamp).split('-').map(Number)
  return Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000)
}

export function filterArticlesByDateRange(articles, range, now = Date.now()) {
  const normalizedRange = normalizeNewsDateRange(range)
  const nowTimestamp = now instanceof Date ? now.getTime() : now
  const sorted = [...articles].sort((first, second) => {
    const firstTimestamp = new Date(first.publishedAt || first.createdAt || 0).getTime()
    const secondTimestamp = new Date(second.publishedAt || second.createdAt || 0).getTime()
    return (Number.isFinite(secondTimestamp) ? secondTimestamp : 0) - (Number.isFinite(firstTimestamp) ? firstTimestamp : 0)
  })

  if (normalizedRange === 'latest') return sorted

  let yesterdayKey
  if (normalizedRange === 'yesterday') {
    const [year, month, day] = dateInIndia(nowTimestamp).split('-').map(Number)
    yesterdayKey = new Date(Date.UTC(year, month - 1, day) - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  }
  const todayOrdinal = indiaDateOrdinal(nowTimestamp)
  const days = normalizedRange === '7days' ? 7 : normalizedRange === '15days' ? 15 : 30

  return sorted.filter((article) => {
    const timestamp = new Date(article.publishedAt || article.createdAt || '').getTime()
    if (!Number.isFinite(timestamp) || timestamp > nowTimestamp) return false

    if (normalizedRange === 'yesterday') return dateInIndia(timestamp) === yesterdayKey
    const ageInDays = todayOrdinal - indiaDateOrdinal(timestamp)
    return ageInDays >= 1 && ageInDays <= days
  })
}

export function mapPublishedArticle(article) {
  const publishedAt = article.publishedAt || article.createdAt || new Date().toISOString()
  const timestamp = new Date(publishedAt).getTime()
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  const age = minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} hr ago` : `${Math.floor(minutes / 1440)} days ago`
  const content = String(article.content || '').trim()
  const contentText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const summary = article.summary || contentText.slice(0, 280)

  return {
    ...article,
    tag: article.category,
    ago: age,
    date: article.date || new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(publishedAt)),
    read: Number(article.read) || Math.max(1, Math.ceil(contentText.split(/\s+/).filter(Boolean).length / 200)),
    summary,
    contentHtml: content ? sanitizeArticleContent(content) : '',
    image: article.image || '',
    source: article.author || 'YHO News',
    tags: [article.category],
  }
}

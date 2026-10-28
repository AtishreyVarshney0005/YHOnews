let adminArticlesCache = null
let adminArticlesRequest = null

export async function getAdminArticles() {
  if (adminArticlesCache) return adminArticlesCache

  if (!adminArticlesRequest) {
    adminArticlesRequest = fetch('/api/admin/articles')
      .then((response) => readApiResponse(response, 'Could not load articles.'))
      .then((data) => {
        adminArticlesCache = Array.isArray(data.articles) ? data.articles : []
        return adminArticlesCache
      })
      .finally(() => { adminArticlesRequest = null })
  }

  return adminArticlesRequest
}

export function saveAdminArticleCache(article) {
  if (!adminArticlesCache) return
  const index = adminArticlesCache.findIndex((item) => String(item.id) === String(article.id))
  adminArticlesCache = index < 0
    ? [article, ...adminArticlesCache]
    : adminArticlesCache.map((item, itemIndex) => itemIndex === index ? article : item)
}

export function removeAdminArticleFromCache(id) {
  if (!adminArticlesCache) return
  adminArticlesCache = adminArticlesCache.filter((article) => String(article.id) !== String(id))
}

export function clearAdminArticlesCache() {
  adminArticlesCache = null
  adminArticlesRequest = null
}

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

const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://yhonewsindia.onrender.com').replace(/\/+$/, '')
const CATEGORIES = ['india', 'world', 'politics', 'business', 'technology', 'sports', 'entertainment', 'education', 'health', 'lifestyle']

const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (character) => ({
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
})[character])

export function createSitemapXml(articles) {
  const staticPaths = [
    ['/', 'hourly', '1.0'],
    ['/about', 'monthly', '0.5'],
    ['/contact', 'monthly', '0.4'],
    ['/privacy', 'yearly', '0.2'],
    ['/terms', 'yearly', '0.2'],
    ...CATEGORIES.map((category) => [`/category/${category}`, 'daily', '0.8']),
  ]
  const urls = staticPaths.map(([pathname, changefreq, priority]) => (
    `<url><loc>${SITE_URL}${pathname}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
  ))

  articles.forEach((article) => {
    if (!article.id) return
    const loc = `${SITE_URL}/article/${encodeURIComponent(article.id)}`
    const lastmod = article.updatedAt || article.publishedAt
    const modified = lastmod ? new Date(lastmod) : null
    const lastmodTag = modified && Number.isFinite(modified.getTime()) ? `<lastmod>${modified.toISOString()}</lastmod>` : ''
    urls.push(`<url><loc>${escapeXml(loc)}</loc>${lastmodTag}<changefreq>weekly</changefreq><priority>0.7</priority></url>`)
  })

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`
}

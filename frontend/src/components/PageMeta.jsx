import { useEffect } from 'react'
import { siteUrl } from '../site.js'

const DEFAULT_TITLE = 'YHO News | Latest News, Headlines and Updates'
const DEFAULT_DESCRIPTION = 'Stay informed with the latest news, headlines and updates from India and around the world on YHO News.'

function setMeta(selector, attribute, value, content) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, value)
    document.head.append(element)
  }
  element.setAttribute('content', content)
}

export default function PageMeta({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = window.location.pathname,
  image,
  type = 'website',
  robots = 'index, follow',
  structuredData,
}) {
  const structuredDataJson = structuredData ? JSON.stringify(structuredData) : ''

  useEffect(() => {
    const canonicalUrl = siteUrl(path)
    document.title = title
    setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('meta[name="robots"]', 'name', 'robots', robots)
    setMeta('meta[property="og:type"]', 'property', 'og:type', type)
    setMeta('meta[property="og:title"]', 'property', 'og:title', title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl)
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
    if (image) {
      const imageUrl = siteUrl(image)
      setMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl)
      setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl)
    } else {
      document.head.querySelector('meta[property="og:image"]')?.remove()
      document.head.querySelector('meta[name="twitter:image"]')?.remove()
    }

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    canonical.href = canonicalUrl

    let structuredDataElement = document.getElementById('page-structured-data')
    if (structuredDataJson) {
      if (!structuredDataElement) {
        structuredDataElement = document.createElement('script')
        structuredDataElement.id = 'page-structured-data'
        structuredDataElement.type = 'application/ld+json'
        document.head.append(structuredDataElement)
      }
      structuredDataElement.textContent = structuredDataJson
    } else {
      structuredDataElement?.remove()
    }
  }, [description, image, path, robots, structuredDataJson, title, type])

  return null
}

const SITE_URL = __PUBLIC_SITE_URL__.replace(/\/+$/, '')

export function siteUrl(path = '/') {
  return new URL(path, `${SITE_URL}/`).href
}

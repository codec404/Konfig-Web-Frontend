const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || 'localhost'

/**
 * Returns the org slug if running on an org subdomain, or null on the main domain.
 * e.g. "acme.localhost" → "acme"
 *      "acme.konfig.org.in" → "acme"
 *      "localhost" → null
 *      "konfig.org.in" → null
 */
export function getOrgSlug(): string | null {
  const hostname = window.location.hostname
  if (hostname === BASE_DOMAIN) return null
  if (hostname === 'localhost') return null
  const suffix = '.' + BASE_DOMAIN
  if (hostname.endsWith(suffix)) {
    return hostname.slice(0, -suffix.length)
  }
  return null
}

/**
 * Returns the URL for an org's subdomain.
 */
export function getOrgSubdomainUrl(slug: string): string {
  const { protocol, port } = window.location
  const portPart = port ? `:${port}` : ''
  return `${protocol}//${slug}.${BASE_DOMAIN}${portPart}`
}

/**
 * Returns the main domain URL.
 */
export function getMainDomainUrl(): string {
  const { protocol, port } = window.location
  const portPart = port ? `:${port}` : ''
  return `${protocol}//${BASE_DOMAIN}${portPart}`
}

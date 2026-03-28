import axios from 'axios'
import { getOrgSlug } from '../utils/subdomain'
import { logger } from '../lib/logger'

const API_BASE = import.meta.env.VITE_API_URL || ''

let activeOrgId: string | null = null

export function setActiveOrg(orgId: string | null) {
  activeOrgId = orgId
}

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  if (activeOrgId) {
    config.headers['X-Org-ID'] = activeOrgId
  }
  const orgSlug = getOrgSlug()
  if (orgSlug && !activeOrgId) {
    config.headers['X-Org-Slug'] = orgSlug
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred'
    if (status && status !== 401) {
      logger.error('api error', {
        status,
        url: error.config?.url,
        method: error.config?.method,
        message,
      })
    }
    return Promise.reject(new Error(message))
  }
)

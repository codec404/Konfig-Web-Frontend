import axios from 'axios'

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
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  }
)

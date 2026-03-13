import { apiClient } from './client'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'user'
}

export interface AuthResponse {
  user: AuthUser
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/api/auth/login', { email, password }).then(r => r.data),

  signup: (name: string, email: string, password: string) =>
    apiClient.post<AuthResponse>('/api/auth/signup', { name, email, password }).then(r => r.data),

  me: () =>
    apiClient.get<AuthUser>('/api/auth/me').then(r => r.data),

  logout: () =>
    apiClient.post('/api/auth/logout').then(r => r.data),

  googleLogin: () => {
    window.location.href = '/api/auth/google'
  },
}

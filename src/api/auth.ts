import { apiClient } from './client'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'user'
  account_type?: 'individual' | 'org'
  org_id?: string
  member_status?: 'pending' | 'approved' | 'rejected'
  phone?: string
  avatar_url?: string
}

export interface AuthResponse {
  user: AuthUser
}

export interface SignupParams {
  name: string
  email: string
  account_type: 'individual' | 'org'
  org_id?: string
}

export const authApi = {
  signup: (params: SignupParams) =>
    apiClient.post<AuthResponse>('/api/auth/signup', params).then(r => r.data),

  me: () =>
    apiClient.get<AuthUser>('/api/auth/me').then(r => r.data),

  updateMe: (params: { name?: string; phone?: string; avatar_url?: string }) =>
    apiClient.put<{ user: AuthUser }>('/api/me', params).then(r => r.data),

  logout: () =>
    apiClient.post('/api/auth/logout').then(r => r.data),

  googleLogin: () => {
    window.location.href = '/api/auth/google'
  },

  // OTP-based flows
  sendOTP: (email: string, purpose: 'login' | 'set_password', orgSlug?: string) =>
    apiClient.post<{ sent: boolean }>('/api/auth/send-otp', { email, purpose, org_slug: orgSlug || undefined }).then(r => r.data),

  loginWithOTP: (email: string, code: string) =>
    apiClient.post<AuthResponse>('/api/auth/login-otp', { email, code }).then(r => r.data),
}

import { apiClient } from './client'

export interface OrgMembership {
  id: string
  org_id: string
  org_name: string
  user_id: string
  role: 'admin' | 'user'
  status: 'invited' | 'active'
  invited_by: string
  created_at: string
}

export interface OrgInvite {
  id: string
  org_id: string
  org_name: string
  email: string
  role: 'admin' | 'user'
  invited_by: string
  inviter_name: string
  token: string
  expires_at: string
  created_at: string
}

export interface Org {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface OrgMember {
  user_id: string
  name: string
  email: string
  role: 'admin' | 'user'
  member_status: 'pending' | 'approved' | 'rejected'
  joined_at: string
}

export interface AllUser {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'user'
  account_type: 'individual' | 'org' | ''
  org_id: string
  org_name: string
  member_status: 'pending' | 'approved' | 'rejected' | ''
  created_at: string
}

export interface OrgService {
  service_name: string
  latest_version: number
  config_count: number
}

export interface ServiceVisibility {
  id: string
  org_id: string
  user_id: string
  service_name: string
  granted_by: string
  created_at: string
}

// ── Super admin ───────────────────────────────────────────────────────────────

export const superAdminApi = {
  listOrgs: () =>
    apiClient.get<{ orgs: Org[] }>('/api/admin/orgs').then(r => r.data),

  createOrg: (name: string, firstAdminEmail: string) =>
    apiClient.post<{ org: Org }>('/api/admin/orgs', { name, first_admin_email: firstAdminEmail }).then(r => r.data),

  deleteOrg: (orgId: string) =>
    apiClient.delete(`/api/admin/orgs/${orgId}`).then(r => r.data),

  getOrgMembers: (orgId: string) =>
    apiClient.get<{ members: OrgMember[] }>(`/api/admin/orgs/${orgId}/members`).then(r => r.data),

  getOrgServices: (orgId: string) =>
    apiClient.get<{ services: OrgService[] }>(`/api/admin/orgs/${orgId}/services`).then(r => r.data),

  listAllUsers: () =>
    apiClient.get<{ users: AllUser[] }>('/api/admin/users').then(r => r.data),

  addUser: (params: { name: string; email: string; org_id: string; role: 'admin' | 'user' }) =>
    apiClient.post('/api/admin/users', params).then(r => r.data),

  removeUser: (userId: string) =>
    apiClient.delete(`/api/admin/users/${userId}`).then(r => r.data),

  updateUser: (userId: string, name?: string) =>
    apiClient.put(`/api/admin/users/${userId}`, { name }).then(r => r.data),
}

// ── Org admin ─────────────────────────────────────────────────────────────────

export const orgAdminApi = {
  listPending: () =>
    apiClient.get<{ members: OrgMember[] }>('/api/org/pending').then(r => r.data),

  listMembers: () =>
    apiClient.get<{ members: OrgMember[] }>('/api/org/members').then(r => r.data),

  approveMember: (userId: string) =>
    apiClient.post(`/api/org/members/${userId}/approve`).then(r => r.data),

  rejectMember: (userId: string) =>
    apiClient.post(`/api/org/members/${userId}/reject`).then(r => r.data),

  removeMember: (userId: string) =>
    apiClient.delete(`/api/org/members/${userId}`).then(r => r.data),

  updateMember: (userId: string, name?: string) =>
    apiClient.put(`/api/org/members/${userId}`, { name }).then(r => r.data),

  listVisibility: (serviceName: string) =>
    apiClient.get<{ visibility: ServiceVisibility[] }>(`/api/org/services/${encodeURIComponent(serviceName)}/visibility`).then(r => r.data),

  grantVisibility: (serviceName: string, userId: string) =>
    apiClient.post(`/api/org/services/${encodeURIComponent(serviceName)}/visibility`, { user_id: userId }).then(r => r.data),

  revokeVisibility: (serviceName: string, userId: string) =>
    apiClient.delete(`/api/org/services/${encodeURIComponent(serviceName)}/visibility/${userId}`).then(r => r.data),

  inviteUser: (email: string, role: 'admin' | 'user') =>
    apiClient.post('/api/org/invite', { email, role }).then(r => r.data),

  listInvites: () =>
    apiClient.get<{ invites: OrgInvite[] }>('/api/org/invites').then(r => r.data),
}

// ── Me: orgs & invites ────────────────────────────────────────────────────────

export const meApi = {
  listOrgs: () =>
    apiClient.get<{ orgs: OrgMembership[] }>('/api/me/orgs').then(r => r.data),

  listInvites: () =>
    apiClient.get<{ invites: OrgInvite[] }>('/api/me/invites').then(r => r.data),

  acceptInvite: (token: string) =>
    apiClient.post('/api/me/invites/accept', { token }).then(r => r.data),

  declineInvite: (token: string) =>
    apiClient.post('/api/me/invites/decline', { token }).then(r => r.data),
}

// ── Org-specific (any member) ─────────────────────────────────────────────────

export const orgApi = {
  getServices: (orgId: string) =>
    apiClient.get<{ services: OrgService[]; org_id: string; role: string }>(`/api/orgs/${orgId}/services`).then(r => r.data),
}

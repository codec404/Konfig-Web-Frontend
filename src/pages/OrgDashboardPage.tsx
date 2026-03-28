import { useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { orgApi, orgAdminApi, type OrgInvite, type OrgMember, type OrgService } from '../api/orgs'
import { setActiveOrg } from '../api/client'
import { getOrgSlug, getMainDomainUrl } from '../utils/subdomain'
import RolloutsPage from './RolloutsPage'
import LiveUpdates from '../components/LiveUpdates'
import SchemasPage from './SchemasPage'
import UploadConfig from '../components/UploadConfig'
import OrgPermissionsModal from './OrgPermissionsModal'
import { useState } from 'react'
import { Building2, Lock, Layers, User, ShieldCheck, Key, Trash2 } from 'lucide-react'

type Tab = 'services' | 'rollouts' | 'live' | 'schemas' | 'users'

function pathToTab(pathname: string): Tab {
  if (pathname === '/rollouts') return 'rollouts'
  if (pathname === '/live') return 'live'
  if (pathname === '/schemas') return 'schemas'
  if (pathname === '/users') return 'users'
  return 'services'
}

export default function OrgDashboardPage() {
  const { orgId: paramOrgId } = useParams<{ orgId: string }>()
  const orgSlug = getOrgSlug()
  const { user } = useAuth()
  const location = useLocation()

  // On subdomain, drive tab from URL path. On path-based (/orgs/:id), use state.
  const isSubdomain = !!orgSlug
  const tab: Tab = isSubdomain ? pathToTab(location.pathname) : 'services'

  const { data: slugData, isError: slugError } = useQuery({
    queryKey: ['org-by-slug', orgSlug],
    queryFn: () => fetch(`/api/public/orgs/by-slug/${orgSlug}`).then(r => {
      if (!r.ok) throw new Error('not found')
      return r.json()
    }),
    enabled: !!orgSlug && !paramOrgId,
    retry: false,
  })

  const orgId = paramOrgId || slugData?.org_id
  const orgName = slugData?.org_name ?? ''

  useEffect(() => {
    setActiveOrg(orgId!)
    return () => setActiveOrg(null)
  }, [orgId])

  const { data: servicesData, isLoading: servicesLoading, error: servicesError } = useQuery({
    queryKey: ['orgs', orgId, 'services'],
    queryFn: () => orgApi.getServices(orgId!),
    enabled: !!orgId,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const services = servicesData?.services ?? []
  const myRole = servicesData?.role ?? 'user'
  const isAdmin = myRole === 'admin' || user?.role === 'super_admin'

  if (slugError && !paramOrgId) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <Building2 size={40} style={{ marginBottom: 16, color: 'var(--text-dim)' }} />
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Organization not found</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
          No organization is registered for this subdomain.
        </div>
        <button className="btn btn-primary" onClick={() => { window.location.href = getMainDomainUrl() }}>
          ← Go to Personal Mode
        </button>
      </div>
    )
  }

  if (orgId && (servicesError as any)?.message === '403') {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <Lock size={40} style={{ marginBottom: 16, color: 'var(--text-dim)' }} />
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Access Denied</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
          You are not a member of this organization.
        </div>
        <button className="btn btn-primary" onClick={() => { window.location.href = getMainDomainUrl() }}>
          ← Go to Personal Mode
        </button>
      </div>
    )
  }

  // On non-subdomain path, show old tab-based layout
  if (!isSubdomain) {
    return <OrgDashboardTabbed orgId={orgId!} services={services} isLoading={servicesLoading} isAdmin={isAdmin} />
  }

  // Subdomain: tabs driven by sidebar (URL path)
  return (
    <div>
      <div className="page-header">
        <div className="page-title">{orgName || 'Organization'}</div>
        <div className="page-subtitle">Org-specific services, rollouts and updates</div>
      </div>

      {tab === 'services' && (
        <ServicesTab services={services} isLoading={servicesLoading} orgId={orgId!} />
      )}
      {tab === 'rollouts' && <RolloutsPage />}
      {tab === 'live' && <LiveUpdates />}
      {tab === 'schemas' && <SchemasPage />}
      {isAdmin && tab === 'users' && <UsersTab orgId={orgId!} />}
    </div>
  )
}

// Non-subdomain path-based org dashboard (accessed via /orgs/:orgId)
function OrgDashboardTabbed({
  orgId, services, isLoading, isAdmin,
}: {
  orgId: string; services: OrgService[]; isLoading: boolean; isAdmin: boolean
}) {
  const [tab, setTab] = useState<Tab>('services')
  const tabs: { id: Tab; label: string }[] = [
    { id: 'services', label: 'Services' },
    { id: 'rollouts', label: 'Rollouts' },
    { id: 'live', label: 'Live Updates' },
    { id: 'schemas', label: 'Schemas' },
    ...(isAdmin ? [{ id: 'users' as Tab, label: 'Users' }] : []),
  ]
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Organization</div>
        <div className="page-subtitle">Org-specific services, rollouts and updates</div>
      </div>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: tab === t.id ? 600 : 400, fontSize: 13,
            color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'services' && <ServicesTab services={services} isLoading={isLoading} orgId={orgId} />}
      {tab === 'rollouts' && <RolloutsPage />}
      {tab === 'live' && <LiveUpdates />}
      {tab === 'schemas' && <SchemasPage />}
      {isAdmin && tab === 'users' && <UsersTab orgId={orgId} />}
    </div>
  )
}

function ServicesTab({ services, isLoading, orgId }: { services: OrgService[]; isLoading: boolean; orgId: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [step, setStep] = useState<'name' | 'upload'>('name')

  function closeModal() {
    setShowNew(false)
    setNewServiceName('')
    setStep('name')
  }

  if (isLoading) return <div className="spinner" style={{ margin: '40px auto' }} />

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{services.length} service{services.length !== 1 ? 's' : ''}</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ New Service</button>
      </div>

      <div className="card">
        {services.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
            <Layers size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div>No services yet. Create one to get started.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {services.map(svc => (
              <div key={svc.service_name}
                onClick={() => navigate(`/services/${encodeURIComponent(svc.service_name)}`)}
                style={{
                  background: 'var(--surface-2, #222)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '10px 14px', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>
                  {svc.service_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  v{svc.latest_version} · {svc.config_count} config{svc.config_count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
            padding: 24, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                {step === 'name' ? 'New Service' : `Upload Config — ${newServiceName}`}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
            </div>
            {step === 'name' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Service Name</label>
                  <input
                    className="form-control"
                    value={newServiceName}
                    onChange={e => setNewServiceName(e.target.value)}
                    placeholder="e.g. auth-service"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && newServiceName.trim() && setStep('upload')}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-primary" disabled={!newServiceName.trim()} onClick={() => setStep('upload')}>
                    Next →
                  </button>
                </div>
              </div>
            ) : (
              <UploadConfig
                serviceName={newServiceName.trim()}
                onSuccess={() => {
                  qc.invalidateQueries({ queryKey: ['orgs', orgId, 'services'] })
                  navigate(`/services/${encodeURIComponent(newServiceName.trim())}`)
                  closeModal()
                }}
                onCancel={closeModal}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}

function UsersTab({ orgId }: { orgId: string }) {
  const qc = useQueryClient()
  const { user: currentUser } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState('')
  const [permUserId, setPermUserId] = useState<string | null>(null)
  const [permUserName, setPermUserName] = useState('')
  const [changeRoleMember, setChangeRoleMember] = useState<OrgMember | null>(null)
  const [profileMember, setProfileMember] = useState<OrgMember | null>(null)

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['org', orgId, 'members'],
    queryFn: orgAdminApi.listMembers,
  })

  const { data: invitesData, isLoading: invitesLoading } = useQuery({
    queryKey: ['org', orgId, 'invites'],
    queryFn: orgAdminApi.listInvites,
  })

  const remove = useMutation({
    mutationFn: (userId: string) => orgAdminApi.removeMember(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', orgId, 'members'] }),
  })

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'user' }) =>
      orgAdminApi.changeOrgMemberRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org', orgId, 'members'] })
      setChangeRoleMember(null)
    },
    onError: () => setErr('Failed to change role'),
  })

  const invite = useMutation({
    mutationFn: () => orgAdminApi.inviteUser(email, role),
    onSuccess: () => {
      setSuccess(`Invite sent to ${email}`)
      setEmail('')
      setErr('')
      qc.invalidateQueries({ queryKey: ['org', orgId, 'invites'] })
    },
    onError: (e: any) => {
      const msg = e?.message ?? ''
      if (msg === 'user not registered') setErr('No account found. Ask Super Admin to create the user first.')
      else if (msg === 'already a member') setErr('This user is already a member.')
      else setErr('Failed to send invite.')
      setSuccess('')
    },
  })

  const members: OrgMember[] = membersData?.members ?? []
  const invites: OrgInvite[] = invitesData?.invites ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Invite */}
      <div className="card section">
        <div className="card-header"><span className="card-title">Invite User</span></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 200 }}>
            <label>Email</label>
            <input className="form-control" type="email" value={email}
              onChange={e => { setEmail(e.target.value); setErr(''); setSuccess('') }}
              placeholder="user@example.com" />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 120 }}>
            <label>Role</label>
            <select className="form-control" value={role} onChange={e => setRole(e.target.value as 'user' | 'admin')}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => invite.mutate()} disabled={!email || invite.isPending}>
            Send Invite
          </button>
        </div>
        {err && <div className="auth-error" style={{ marginTop: 10 }}>{err}</div>}
        {success && <div style={{ color: 'var(--success, #22c55e)', fontSize: 13, marginTop: 10 }}>{success}</div>}
      </div>

      {/* Members */}
      <div className="card">
        <div className="card-header"><span className="card-title">Members</span></div>
        {membersLoading ? <div className="spinner" style={{ margin: '20px auto' }} /> :
          members.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0' }}>No members yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Email', 'Role', ''].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{m.name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{m.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: m.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'var(--surface-2)',
                          color: m.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)',
                          border: m.role === 'admin' ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border)',
                        }}>{m.role}</span>
                        {m.blocked && (
                          <span style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.3)',
                          }}>blocked</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button
                          title="View profile"
                          onClick={() => setProfileMember(m)}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'border-color 0.15s, color 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                        >
                          <User size={13} />
                        </button>
                        <button
                          title="Change role"
                          onClick={() => setChangeRoleMember(m)}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'border-color 0.15s, color 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                        >
                          <ShieldCheck size={13} />
                        </button>
                        {m.role !== 'admin' && (
                          <button
                            title="Manage permissions"
                            onClick={() => { setPermUserId(m.user_id); setPermUserName(m.name) }}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'border-color 0.15s, color 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                          >
                            <Key size={13} />
                          </button>
                        )}
                        {m.user_id !== currentUser?.id && (
                          <button
                            title="Remove member"
                            onClick={() => remove.mutate(m.user_id)}
                            style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: 'rgba(239,68,68,0.6)', display: 'flex', alignItems: 'center', transition: 'border-color 0.15s, color 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = 'rgba(239,68,68,0.6)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Pending Invites */}
      <div className="card">
        <div className="card-header"><span className="card-title">Pending Invites</span></div>
        {invitesLoading ? <div className="spinner" style={{ margin: '20px auto' }} /> :
          invites.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0' }}>No pending invites.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Email', 'Role', 'Invited', 'Expires'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invites.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>{inv.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: inv.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'var(--surface-2)',
                        color: inv.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)',
                        border: inv.role === 'admin' ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border)',
                      }}>{inv.role}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>{new Date(inv.expires_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {profileMember && (
        <OrgMemberProfileModal member={profileMember} onClose={() => setProfileMember(null)} />
      )}

      {permUserId && (
        <OrgPermissionsModal
          userId={permUserId}
          userName={permUserName}
          onClose={() => setPermUserId(null)}
        />
      )}

      {changeRoleMember && (
        <OrgChangeRoleModal
          member={changeRoleMember}
          onClose={() => setChangeRoleMember(null)}
          onSave={(role) => changeRole.mutate({ userId: changeRoleMember.user_id, role })}
          loading={changeRole.isPending}
        />
      )}
    </div>
  )
}

function OrgMemberProfileModal({ member, onClose }: { member: OrgMember; onClose: () => void }) {
  const initials = (member.name ?? '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 24, width: 360, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Member Profile</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 18, padding: 0 }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          {member.avatar_url ? (
            <img src={member.avatar_url} alt="avatar" style={{ width: 48, height: 48, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
              {initials}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{member.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{member.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>Role</span>
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              background: member.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'var(--surface-2)',
              color: member.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)',
              border: member.role === 'admin' ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border)' }}>
              {member.role}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>Joined</span>
            <span>{new Date(member.joined_at).toLocaleDateString()}</span>
          </div>
          {member.blocked && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status</span>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                blocked
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OrgChangeRoleModal({ member, onClose, onSave, loading }: {
  member: OrgMember
  onClose: () => void
  onSave: (role: 'admin' | 'user') => void
  loading: boolean
}) {
  const [role, setRole] = useState<'admin' | 'user'>(member.role)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 24, width: 360, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Change Role — {member.name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 18, padding: 0 }}>✕</button>
        </div>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Role</label>
          <select className="form-control" value={role} onChange={e => setRole(e.target.value as 'admin' | 'user')}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={loading} onClick={() => onSave(role)}>
            {loading ? <span className="spinner spinner-sm" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

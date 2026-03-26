import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { orgApi, orgAdminApi, type OrgInvite, type OrgMember, type OrgService } from '../api/orgs'
import { setActiveOrg } from '../api/client'

type Tab = 'services' | 'members' | 'invites' | 'visibility'

export default function OrgDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('services')

  useEffect(() => {
    setActiveOrg(orgId!)
    return () => setActiveOrg(null)
  }, [orgId])

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['orgs', orgId, 'services'],
    queryFn: () => orgApi.getServices(orgId!),
    enabled: !!orgId,
  })

  const services = servicesData?.services ?? []
  const myRole = servicesData?.role ?? 'user'
  const isAdmin = myRole === 'admin' || user?.role === 'super_admin' || user?.role === 'admin'

  const tabs: Tab[] = isAdmin ? ['services', 'members', 'invites', 'visibility'] : ['services']

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/orgs')}
            style={{ fontSize: 12, padding: '4px 8px' }}>
            ← Back
          </button>
          <div>
            <div className="page-title">Organization</div>
            <div className="page-subtitle">Services and configurations for this organization</div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400, fontSize: 13,
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, textTransform: 'capitalize',
            }}>
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === 'services' && (
        <ServicesTab services={services} isLoading={servicesLoading} orgId={orgId!} />
      )}
      {isAdmin && tab === 'members' && <MembersTab />}
      {isAdmin && tab === 'invites' && <InvitesTab />}
      {isAdmin && tab === 'visibility' && <VisibilityTab />}
    </div>
  )
}

function ServicesTab({ services, isLoading }: { services: OrgService[]; isLoading: boolean; orgId: string }) {
  const navigate = useNavigate()

  if (isLoading) return <div className="spinner" style={{ margin: '40px auto' }} />

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Services</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{services.length} service{services.length !== 1 ? 's' : ''}</span>
      </div>
      {services.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
          No services available for this organization.
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
  )
}

function MembersTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['org', 'members'],
    queryFn: orgAdminApi.listMembers,
  })

  const remove = useMutation({
    mutationFn: (userId: string) => orgAdminApi.removeMember(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'members'] }),
  })

  const members: OrgMember[] = data?.members ?? []

  if (isLoading) return <div className="spinner" style={{ margin: '40px auto' }} />

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Members</span>
      </div>
      {members.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0' }}>No members yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Email', 'Role', 'Status', ''].map(h => (
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
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: m.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
                    color: m.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)',
                  }}>{m.role}</span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#22c55e', background: '#22c55e22' }}>
                    {m.member_status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {m.role !== 'admin' && (
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => remove.mutate(m.user_id)}
                      style={{ fontSize: 11, color: 'var(--danger, #e05)' }}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function InvitesTab() {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['org', 'invites'],
    queryFn: orgAdminApi.listInvites,
  })

  const invite = useMutation({
    mutationFn: () => orgAdminApi.inviteUser(email, role),
    onSuccess: () => {
      setSuccess(`Invite sent to ${email}`)
      setEmail('')
      setErr('')
      qc.invalidateQueries({ queryKey: ['org', 'invites'] })
    },
    onError: (e: any) => {
      const msg = e?.message ?? ''
      if (msg === 'user not registered') setErr('No account found. Ask Super Admin to create the user first.')
      else if (msg === 'already a member') setErr('This user is already a member.')
      else setErr('Failed to send invite.')
      setSuccess('')
    },
  })

  const invites: OrgInvite[] = data?.invites ?? []

  return (
    <div>
      <div className="card section" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Invite User</span>
        </div>
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

      <div className="card">
        <div className="card-header">
          <span className="card-title">Pending Invites</span>
        </div>
        {isLoading ? (
          <div className="spinner" style={{ margin: '20px auto' }} />
        ) : invites.length === 0 ? (
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
                      background: inv.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
                      color: inv.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)',
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
    </div>
  )
}

function VisibilityTab() {
  const qc = useQueryClient()
  const [serviceName, setServiceName] = useState('')
  const [inputService, setInputService] = useState('')
  const [grantUserId, setGrantUserId] = useState('')

  const { data: visData, isLoading: visLoading } = useQuery({
    queryKey: ['org', 'visibility', serviceName],
    queryFn: () => orgAdminApi.listVisibility(serviceName),
    enabled: !!serviceName,
  })

  const { data: membersData } = useQuery({
    queryKey: ['org', 'members'],
    queryFn: orgAdminApi.listMembers,
  })

  const grant = useMutation({
    mutationFn: () => orgAdminApi.grantVisibility(serviceName, grantUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org', 'visibility', serviceName] })
      setGrantUserId('')
    },
  })

  const revoke = useMutation({
    mutationFn: (userId: string) => orgAdminApi.revokeVisibility(serviceName, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'visibility', serviceName] }),
  })

  const grants = visData?.visibility ?? []
  const members: OrgMember[] = (membersData?.members ?? []).filter(m => m.role === 'user' && m.member_status === 'approved')
  const grantedIds = new Set(grants.map(g => g.user_id))
  const availableToGrant = members.filter(m => !grantedIds.has(m.user_id))

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Service Visibility</span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <input className="form-control" value={inputService} onChange={e => setInputService(e.target.value)}
          placeholder="Enter service name..." style={{ maxWidth: 320 }}
          onKeyDown={e => e.key === 'Enter' && setServiceName(inputService)} />
        <button className="btn btn-primary" onClick={() => setServiceName(inputService)}>View</button>
      </div>

      {!serviceName ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Enter a service name above to manage visibility grants.</div>
      ) : (
        <>
          <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 15 }}>
            Service: <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13, background: 'var(--surface)', padding: '2px 6px', borderRadius: 4 }}>{serviceName}</code>
          </div>
          {availableToGrant.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <select className="form-control" value={grantUserId} onChange={e => setGrantUserId(e.target.value)} style={{ maxWidth: 280 }}>
                <option value="">Select user to grant access...</option>
                {availableToGrant.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.name} ({m.email})</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={() => grant.mutate()} disabled={!grantUserId || grant.isPending}>
                Grant Access
              </button>
            </div>
          )}
          {visLoading ? (
            <div className="spinner" style={{ margin: '20px auto' }} />
          ) : grants.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0' }}>No visibility grants. Admins always have full access.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grants.map(g => {
                const member = members.find(m => m.user_id === g.user_id)
                return (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{member?.name ?? g.user_id}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{member?.email}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => revoke.mutate(g.user_id)}
                      style={{ fontSize: 11, color: 'var(--danger, #e05)' }}>
                      Revoke
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

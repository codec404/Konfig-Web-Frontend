import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orgAdminApi, type OrgMember, type OrgInvite, type ServiceVisibility } from '../api/orgs'

type Tab = 'members' | 'invites' | 'visibility'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('members')
  const [visibilityService, setVisibilityService] = useState('')

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Admin Dashboard</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Manage your organization's members and service access
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {(['members', 'invites', 'visibility'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400, fontSize: 13,
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, textTransform: 'capitalize',
            }}
          >
            {t === 'members' ? 'All Members' : t === 'invites' ? 'Invites' : 'Service Visibility'}
          </button>
        ))}
      </div>

      {tab === 'members' && <MembersTab />}
      {tab === 'invites' && <InvitesTab />}
      {tab === 'visibility' && (
        <VisibilityTab
          serviceName={visibilityService}
          onServiceChange={setVisibilityService}
        />
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
      <div className="card">
        <div className="card-header"><span className="card-title">Pending Invites</span></div>
        {isLoading ? <div className="spinner" style={{ margin: '20px auto' }} /> : invites.length === 0 ? (
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
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: inv.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
                      color: inv.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)' }}>{inv.role}</span>
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
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          {['Name', 'Email', 'Role', 'Status', 'Joined', ''].map(h => (
            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11,
              textTransform: 'uppercase', color: 'var(--text-dim)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {members.map(m => (
          <tr key={m.user_id} style={{ borderBottom: '1px solid var(--border-subtle, var(--border))' }}>
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
              <StatusBadge status={m.member_status} />
            </td>
            <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
              {new Date(m.joined_at).toLocaleDateString()}
            </td>
            <td style={{ padding: '10px 12px' }}>
              {m.role !== 'admin' && (
                <button className="btn btn-ghost btn-sm" onClick={() => remove.mutate(m.user_id)}
                  style={{ padding: '2px 8px', fontSize: 11, color: 'var(--danger, #e05)' }}>
                  Remove
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function VisibilityTab({ serviceName, onServiceChange }: {
  serviceName: string
  onServiceChange: (s: string) => void
}) {
  const qc = useQueryClient()
  const [inputService, setInputService] = useState(serviceName)
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

  const grants: ServiceVisibility[] = visData?.visibility ?? []
  const members: OrgMember[] = (membersData?.members ?? []).filter(m => m.role === 'user' && m.member_status === 'approved')

  // Members not yet granted visibility
  const grantedIds = new Set(grants.map(g => g.user_id))
  const availableToGrant = members.filter(m => !grantedIds.has(m.user_id))

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <input
          className="form-control"
          value={inputService}
          onChange={e => setInputService(e.target.value)}
          placeholder="Enter service name..."
          style={{ maxWidth: 320 }}
          onKeyDown={e => e.key === 'Enter' && onServiceChange(inputService)}
        />
        <button className="btn btn-primary" onClick={() => onServiceChange(inputService)}>
          View
        </button>
      </div>

      {!serviceName && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Enter a service name above to manage visibility grants.
        </div>
      )}

      {serviceName && (
        <>
          <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 15 }}>
            Service: <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13, background: 'var(--surface)', padding: '2px 6px', borderRadius: 4 }}>{serviceName}</code>
          </div>

          {/* Grant visibility */}
          {availableToGrant.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <select className="form-control" value={grantUserId} onChange={e => setGrantUserId(e.target.value)}
                style={{ maxWidth: 280 }}>
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
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0' }}>
              No visibility grants for this service. Admins always have full access.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grants.map(g => {
                const member = members.find(m => m.user_id === g.user_id)
                return (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8,
                    background: 'var(--surface)',
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { approved: '#22c55e', pending: '#f59e0b', rejected: '#ef4444' }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      color: colors[status] ?? 'var(--text-muted)', background: `${colors[status] ?? '#888'}22` }}>
      {status}
    </span>
  )
}

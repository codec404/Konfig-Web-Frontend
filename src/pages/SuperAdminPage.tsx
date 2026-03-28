import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { superAdminApi, bugAdminApi, type Org, type OrgMember, type AllUser, type OrgService, type BugReport } from '../api/orgs'
import { Bug } from 'lucide-react'

type Tab = 'orgs' | 'users' | 'bugs'

export default function SuperAdminPage({ tab }: { tab: Tab }) {
  if (tab === 'users') return <UsersTab />
  if (tab === 'bugs') return <BugReportsTab />
  return <OrgsTab />
}

// ── Orgs tab ──────────────────────────────────────────────────────────────────

function OrgsTab() {
  const qc = useQueryClient()
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [err, setErr] = useState('')

  const { data: orgsData, isLoading } = useQuery({
    queryKey: ['admin', 'orgs'],
    queryFn: superAdminApi.listOrgs,
  })

  const deleteOrg = useMutation({
    mutationFn: (orgId: string) => superAdminApi.deleteOrg(orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orgs'] })
      setSelectedOrg(null)
      setErr('')
    },
    onError: (e: any) => setErr(e?.message || 'Failed to delete organization'),
  })

  const orgs: Org[] = orgsData?.orgs ?? []

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Organizations</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            {orgs.length} organization{orgs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Organization</button>
      </div>

      {err && <div className="auth-error" style={{ marginBottom: 16 }}>{err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
        {/* Sidebar */}
        <div>
          {isLoading ? (
            <div className="spinner" style={{ margin: '20px auto' }} />
          ) : orgs.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No organizations yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {orgs.map(org => (
                <div
                  key={org.id}
                  onClick={() => setSelectedOrg(org)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, border: '1px solid',
                    borderColor: selectedOrg?.id === org.id ? 'var(--accent)' : 'var(--border)',
                    background: selectedOrg?.id === org.id ? 'rgba(99,102,241,0.15)' : 'var(--surface-2, #1a1a2e)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{org.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {org.member_count === 0
                        ? <span style={{ color: 'var(--warning, #f59e0b)', fontStyle: 'italic' }}>Empty org</span>
                        : new Date(org.created_at).toLocaleDateString()
                      }
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={e => {
                      e.stopPropagation()
                      if (confirm(`Delete "${org.name}"? This cannot be undone.`)) {
                        deleteOrg.mutate(org.id)
                      }
                    }}
                    style={{ padding: '2px 6px', fontSize: 12, color: 'var(--danger, #e05)' }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div>
          {!selectedOrg ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200,
              fontSize: 13, color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 12,
            }}>
              Select an organization to view details
            </div>
          ) : (
            <OrgDetail org={selectedOrg} onError={setErr} />
          )}
        </div>
      </div>

      {showCreate && (
        <CreateOrgModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'orgs'] })
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}

function OrgDetail({ org, onError }: { org: Org; onError: (msg: string) => void }) {
  const qc = useQueryClient()
  const [detailTab, setDetailTab] = useState<'members' | 'services'>('members')
  const [showAddUser, setShowAddUser] = useState(false)
  const [removeErr, setRemoveErr] = useState('')
  const [profileMember, setProfileMember] = useState<OrgMember | null>(null)

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['admin', 'orgs', org.id, 'members'],
    queryFn: () => superAdminApi.getOrgMembers(org.id),
  })

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['admin', 'orgs', org.id, 'services'],
    queryFn: () => superAdminApi.getOrgServices(org.id),
    enabled: detailTab === 'services',
  })

  const removeUser = useMutation({
    mutationFn: (userId: string) => superAdminApi.removeFromOrg(org.id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orgs', org.id, 'members'] })
      qc.invalidateQueries({ queryKey: ['admin', 'orgs'] })
      setRemoveErr('')
    },
    onError: (e: any) => setRemoveErr(e?.message || 'Failed to remove member'),
  })

  const members: OrgMember[] = membersData?.members ?? []
  const services: OrgService[] = servicesData?.services ?? []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{org.name}</h2>
        <button className="btn btn-sm" onClick={() => setShowAddUser(true)}>+ Add User</button>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {(['members', 'services'] as const).map(t => (
          <button key={t} onClick={() => setDetailTab(t)} style={{
            padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: detailTab === t ? 600 : 400, fontSize: 13,
            color: detailTab === t ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: detailTab === t ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1, textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>

      {detailTab === 'members' && (
        membersLoading ? <div className="spinner" style={{ margin: '20px auto' }} /> :
        members.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No members yet</div>
        ) : (
          <>
            {removeErr && <div className="auth-error" style={{ marginBottom: 12 }}>{removeErr}</div>}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Email', 'Role', 'Joined', ''].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.user_id} style={{ borderBottom: '1px solid var(--border-subtle, var(--border))' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{m.name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{m.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <RoleBadge role={m.role} />
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                      {new Date(m.joined_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => setProfileMember(m)}
                          style={{ fontSize: 11 }}>
                          Profile
                        </button>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => { setRemoveErr(''); removeUser.mutate(m.user_id) }}
                          style={{ fontSize: 11, color: 'var(--danger, #e05)' }}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )
      )}

      {detailTab === 'services' && (
        servicesLoading ? <div className="spinner" style={{ margin: '20px auto' }} /> :
        services.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No services in this organization</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Service', 'Configs', 'Latest Version'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.service_name} style={{ borderBottom: '1px solid var(--border-subtle, var(--border))' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{s.service_name}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{s.config_count}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{s.latest_version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {showAddUser && (
        <AddUserModal
          orgId={org.id}
          orgName={org.name}
          onClose={() => setShowAddUser(false)}
          onAdded={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'orgs', org.id, 'members'] })
            setShowAddUser(false)
          }}
          onError={onError}
        />
      )}

      {profileMember && (
        <UserProfileModal
          name={profileMember.name}
          email={profileMember.email}
          role={profileMember.role}
          date={profileMember.joined_at}
          dateLabel="Joined"
          blocked={profileMember.blocked}
          avatarUrl={profileMember.avatar_url}
          onClose={() => setProfileMember(null)}
        />
      )}
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [err, setErr] = useState('')
  const [profileUser, setProfileUser] = useState<AllUser | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: superAdminApi.listAllUsers,
  })

  const blockUser = useMutation({
    mutationFn: (userId: string) => superAdminApi.blockUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: () => setErr('Failed to block user'),
  })

  const unblockUser = useMutation({
    mutationFn: (userId: string) => superAdminApi.unblockUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: () => setErr('Failed to unblock user'),
  })

  const users: AllUser[] = (data?.users ?? []).filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.orgs?.some(o => o.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Users</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            {(data?.users ?? []).length} total user{(data?.users ?? []).length !== 1 ? 's' : ''}
          </p>
        </div>
        <input
          className="form-control"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users..."
          style={{ width: 220 }}
        />
      </div>

      {err && <div className="auth-error" style={{ marginBottom: 16 }}>{err}</div>}

      {isLoading ? (
        <div className="spinner" style={{ margin: '40px auto' }} />
      ) : users.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
          {search ? 'No users match your search' : 'No users found'}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Email', 'Organizations', 'Joined', ''].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle, var(--border))' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{u.name}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{u.email}</td>
                <td style={{ padding: '10px 12px' }}>
                  {u.orgs && u.orgs.length > 0
                    ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {u.orgs.map(o => (
                          <span key={o} style={{ padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                            background: 'rgba(99,102,241,0.12)', color: 'var(--accent)' }}>{o}</span>
                        ))}
                      </div>
                    : <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                  }
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => setProfileUser(u)}
                      style={{ fontSize: 11 }}>
                      Profile
                    </button>
                    {u.role !== 'super_admin' && (
                      u.blocked ? (
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => unblockUser.mutate(u.id)}
                          style={{ fontSize: 11, color: 'var(--success, #22c55e)' }}>Unblock</button>
                      ) : (
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => { if (confirm(`Block ${u.name}? They won't be able to log in.`)) blockUser.mutate(u.id) }}
                          style={{ fontSize: 11, color: 'var(--danger, #e05)' }}>Block</button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {profileUser && (
        <UserProfileModal
          name={profileUser.name}
          email={profileUser.email}
          role={profileUser.role}
          date={profileUser.created_at}
          dateLabel="Joined"
          blocked={profileUser.blocked}
          orgs={profileUser.orgs}
          avatarUrl={profileUser.avatar_url}
          onClose={() => setProfileUser(null)}
        />
      )}
    </div>
  )
}

// ── Modals ────────────────────────────────────────────────────────────────────

function CreateOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [orgName, setOrgName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) { setErr('Organization name cannot be blank'); return }
    if (!adminEmail.trim()) { setErr('Admin email is required'); return }
    setErr('')
    setLoading(true)
    try {
      await superAdminApi.createOrg(orgName.trim(), adminEmail.trim())
      onCreated()
    } catch (e: any) {
      setErr(e?.message || 'Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="New Organization" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label>Organization Name</label>
          <input className="form-control" value={orgName} onChange={e => setOrgName(e.target.value)}
            placeholder="Acme Corp" required autoFocus />
        </div>
        <div className="form-group">
          <label>First Admin Email</label>
          <input className="form-control" type="email" value={adminEmail}
            onChange={e => setAdminEmail(e.target.value)} placeholder="admin@example.com" required />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            The user must already have an account.
          </p>
        </div>
        {err && <div className="auth-error">{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AddUserModal({ orgId, orgName, onClose, onAdded, onError }: {
  orgId: string; orgName: string
  onClose: () => void; onAdded: () => void; onError: (msg: string) => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'user'>('user')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await superAdminApi.addUser({ email, role, org_id: orgId })
      onAdded()
    } catch (e: any) {
      const msg = e?.message || 'Failed to add user'
      setErr(msg)
      onError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Add User to ${orgName}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label>Email</label>
          <input className="form-control" type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="user@example.com" required autoFocus />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            The user must already have an account.
          </p>
        </div>
        <div className="form-group">
          <label>Role</label>
          <select className="form-control" value={role} onChange={e => setRole(e.target.value as 'admin' | 'user')}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {err && <div className="auth-error">{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : 'Add User'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Bug Reports tab ───────────────────────────────────────────────────────────

const ISSUE_TYPE_LABELS: Record<string, string> = {
  bug: 'Bug',
  feature_request: 'Feature Request',
  performance: 'Performance',
  ui_ux: 'UI / UX',
  security: 'Security',
  other: 'Other',
}

const STATUS_COLORS: Record<string, [string, string]> = {
  open:        ['#f59e0b', 'rgba(245,158,11,0.12)'],
  in_progress: ['var(--accent)', 'rgba(99,102,241,0.12)'],
  resolved:    ['#22c55e', 'rgba(34,197,94,0.12)'],
  closed:      ['var(--text-dim)', 'var(--surface)'],
}

function BugReportsTab() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'bugs'],
    queryFn: bugAdminApi.list,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      bugAdminApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'bugs'] }),
  })

  const reports: BugReport[] = data?.reports ?? []

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Bug Reports</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          {reports.length} report{reports.length !== 1 ? 's' : ''}
        </p>
      </div>

      {isLoading ? (
        <div className="spinner" style={{ margin: '40px auto' }} />
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          <Bug size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>No issue reports yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reports.map(r => {
            const [statusColor, statusBg] = STATUS_COLORS[r.status] ?? STATUS_COLORS.open
            const isOpen = expanded === r.id
            return (
              <div key={r.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                >
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>
                    {isOpen ? '▾' : '▸'}
                  </span>
                  <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', flexShrink: 0 }}>
                    {ISSUE_TYPE_LABELS[r.issue_type] ?? r.issue_type}
                  </span>
                  <span style={{ fontWeight: 500, fontSize: 13, flex: 1, minWidth: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.title}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>
                    {r.user_email}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    color: statusColor, background: statusBg, flexShrink: 0 }}>
                    {r.status.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                    <p style={{ margin: '12px 0', fontSize: 13, color: 'var(--text-muted)',
                      whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{r.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Status:</span>
                      {['open', 'in_progress', 'resolved', 'closed'].map(s => {
                        const [c, bg] = STATUS_COLORS[s]
                        return (
                          <button key={s}
                            onClick={() => updateStatus.mutate({ id: r.id, status: s })}
                            disabled={r.status === s || updateStatus.isPending}
                            style={{
                              padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                              cursor: r.status === s ? 'default' : 'pointer',
                              color: c, background: r.status === s ? bg : 'transparent',
                              border: `1px solid ${r.status === s ? c : 'var(--border)'}`,
                              opacity: r.status === s ? 1 : 0.7,
                            }}
                          >
                            {s.replace('_', ' ')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 24, width: 420, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 18, padding: 0 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function UserProfileModal({ name, email, role, date, dateLabel, blocked, orgs, avatarUrl, onClose }: {
  name: string; email: string; role: string; date: string; dateLabel: string
  blocked: boolean; orgs?: string[]; avatarUrl?: string; onClose: () => void
}) {
  const initials = (name ?? '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 24, width: 380, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>User Profile</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 18, padding: 0 }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" style={{ width: 48, height: 48, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
              {initials}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>Role</span>
            <RoleBadge role={role} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>{dateLabel}</span>
            <span>{new Date(date).toLocaleDateString()}</span>
          </div>
          {orgs && orgs.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Organizations</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                {orgs.map(o => (
                  <span key={o} style={{ padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                    background: 'rgba(99,102,241,0.12)', color: 'var(--accent)' }}>{o}</span>
                ))}
              </div>
            </div>
          )}
          {blocked && (
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

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, [string, string]> = {
    super_admin: ['#a855f7', '#a855f722'],
    admin: ['var(--accent)', 'rgba(99,102,241,0.15)'],
    user: ['var(--text-muted)', 'var(--surface)'],
  }
  const [color, bg] = colors[role] ?? ['var(--text-muted)', 'var(--surface)']
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color, background: bg }}>
      {role.replace('_', ' ')}
    </span>
  )
}


import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { superAdminApi, type Org, type OrgMember, type AllUser, type OrgService } from '../api/orgs'

type Tab = 'orgs' | 'users'

export default function SuperAdminPage({ tab }: { tab: Tab }) {
  return tab === 'users' ? <UsersTab /> : <OrgsTab />
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
    },
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
                    background: selectedOrg?.id === org.id ? 'rgba(99,102,241,0.12)' : 'var(--surface)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{org.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(org.created_at).toLocaleDateString()}
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
    mutationFn: (userId: string) => superAdminApi.removeUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'orgs', org.id, 'members'] }),
    onError: () => onError('Failed to remove user'),
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Role', 'Status', 'Joined', ''].map(h => (
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
                  <td style={{ padding: '10px 12px' }}>
                    <StatusBadge status={m.member_status} />
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                    {new Date(m.joined_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {m.role !== 'admin' && (
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => removeUser.mutate(m.user_id)}
                        style={{ fontSize: 11, color: 'var(--danger, #e05)' }}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient()
  const [editUser, setEditUser] = useState<AllUser | null>(null)
  const [search, setSearch] = useState('')
  const [err, setErr] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: superAdminApi.listAllUsers,
  })

  const removeUser = useMutation({
    mutationFn: (userId: string) => superAdminApi.removeUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: () => setErr('Failed to remove user'),
  })

  const users: AllUser[] = (data?.users ?? []).filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.org_name?.toLowerCase().includes(search.toLowerCase())
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
              {['Name', 'Email', 'Role', 'Type', 'Organization', 'Status', 'Joined', ''].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle, var(--border))' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{u.name}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{u.email}</td>
                <td style={{ padding: '10px 12px' }}><RoleBadge role={u.role} /></td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                  {u.account_type || '—'}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                  {u.org_name || '—'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {u.member_status ? <StatusBadge status={u.member_status} /> : <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {u.role !== 'super_admin' && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditUser(u)}
                          style={{ fontSize: 11 }}>Edit</button>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => { if (confirm(`Remove ${u.name}?`)) removeUser.mutate(u.id) }}
                          style={{ fontSize: 11, color: 'var(--danger, #e05)' }}>Remove</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'users'] })
            setEditUser(null)
          }}
          onError={setErr}
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
      setErr(e?.response?.data?.error || 'Failed to create organization')
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
            If no account exists for this email, one will be created. They can log in via OTP.
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
  const [form, setForm] = useState({ name: '', email: '', role: 'user' as 'admin' | 'user' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await superAdminApi.addUser({ ...form, org_id: orgId })
      onAdded()
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Failed to add user'
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
          <label>Name</label>
          <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required autoFocus />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input className="form-control" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Role</label>
          <select className="form-control" value={form.role} onChange={e => set('role', e.target.value as 'admin' | 'user')}>
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

function EditUserModal({ user, onClose, onSaved, onError }: {
  user: AllUser; onClose: () => void; onSaved: () => void; onError: (msg: string) => void
}) {
  const [name, setName] = useState(user.name)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await superAdminApi.updateUser(user.id, name || undefined)
      onSaved()
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Failed to update user'
      setErr(msg)
      onError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Edit ${user.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label>Email <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(cannot change)</span></label>
          <input className="form-control" value={user.email} disabled style={{ opacity: 0.6 }} />
        </div>
        <div className="form-group">
          <label>Name</label>
          <input className="form-control" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        {err && <div className="auth-error">{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { approved: '#22c55e', pending: '#f59e0b', rejected: '#ef4444' }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      color: colors[status] ?? 'var(--text-muted)', background: `${colors[status] ?? '#888'}22` }}>
      {status}
    </span>
  )
}

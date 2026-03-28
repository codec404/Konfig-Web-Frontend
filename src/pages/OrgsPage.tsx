import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { meApi, type OrgInvite, type OrgMembership } from '../api/orgs'
import { getOrgSubdomainUrl } from '../utils/subdomain'
import { Building2 } from 'lucide-react'

export default function OrgsPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Organizations</div>
        <div className="page-subtitle">Organizations you belong to and pending invitations</div>
      </div>
      <InvitesSection />
      <MyOrgsSection />
    </div>
  )
}

function InvitesSection() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['me', 'invites'],
    queryFn: meApi.listInvites,
  })

  const accept = useMutation({
    mutationFn: (token: string) => meApi.acceptInvite(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'invites'] })
      qc.invalidateQueries({ queryKey: ['me', 'orgs'] })
    },
  })

  const decline = useMutation({
    mutationFn: (token: string) => meApi.declineInvite(token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'invites'] }),
  })

  const invites: OrgInvite[] = data?.invites ?? []

  if (isLoading) return <div className="spinner" style={{ margin: '20px auto' }} />
  if (invites.length === 0) return null

  return (
    <div className="card section" style={{ marginBottom: 24 }}>
      <div className="card-header">
        <span className="card-title">Pending Invitations</span>
        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{invites.length} pending</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {invites.map(inv => (
          <div key={inv.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10,
            background: 'var(--surface)',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{inv.org_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Invited by {inv.inviter_name || 'admin'} · as <strong>{inv.role}</strong>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                Expires {new Date(inv.expires_at).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-sm"
                onClick={() => decline.mutate(inv.token)}
                disabled={decline.isPending}
                style={{ color: 'var(--danger, #e05)', border: '1px solid var(--border)' }}
              >
                Decline
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => accept.mutate(inv.token)}
                disabled={accept.isPending}
              >
                Accept
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MyOrgsSection() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['me', 'orgs'],
    queryFn: meApi.listOrgs,
  })

  const orgs: OrgMembership[] = data?.orgs ?? []

  if (isLoading) return <div className="spinner" style={{ margin: '40px auto' }} />

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">My Organizations</span>
      </div>
      {orgs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
          <Building2 size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>You are not part of any organization yet.</div>
          <span style={{ fontSize: 12 }}>Ask your admin to invite you.</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, padding: '4px 0' }}>
          {orgs.map(org => (
            <div
              key={org.org_id}
              onClick={() => {
                const slug = org.slug
                if (slug) {
                  window.location.href = getOrgSubdomainUrl(slug)
                } else {
                  navigate(`/orgs/${org.org_id}`)
                }
              }}
              style={{
                padding: '16px 18px', border: '1px solid var(--border)', borderRadius: 10,
                background: 'var(--surface)', cursor: 'pointer', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{org.org_name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: org.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'var(--surface-2)',
                  color: org.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)',
                  border: org.role === 'admin' ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border)',
                }}>
                  {org.role}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  Since {new Date(org.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

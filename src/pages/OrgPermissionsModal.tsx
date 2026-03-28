import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orgAdminApi } from '../api/orgs'

const PERMISSION_MODULES = [
  {
    module: 'General',
    submodules: [
      {
        name: 'Services',
        permissions: [
          { key: 'services.view', label: 'View services & configs' },
          { key: 'services.create', label: 'Create new services' },
          { key: 'configs.create', label: 'Create new config versions' },
          { key: 'configs.delete', label: 'Delete configs' },
        ],
      },
      {
        name: 'Rollouts',
        permissions: [
          { key: 'rollouts.view', label: 'View rollouts' },
          { key: 'rollouts.manage', label: 'Manage rollouts (start, promote, rollback)' },
        ],
      },
      {
        name: 'Schemas',
        permissions: [
          { key: 'schemas.view', label: 'View schemas' },
          { key: 'schemas.manage', label: 'Register schemas' },
        ],
      },
      {
        name: 'Live Updates',
        permissions: [
          { key: 'live.view', label: 'View live updates' },
        ],
      },
    ],
  },
]

export default function OrgPermissionsModal({
  userId,
  userName,
  onClose,
}: {
  userId: string
  userName: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['org', 'member-permissions', userId],
    queryFn: () => orgAdminApi.getMemberPermissions(userId),
  })

  useEffect(() => {
    if (data?.permissions) {
      setSelected(new Set(data.permissions))
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => orgAdminApi.setMemberPermissions(userId, Array.from(selected)),
    onSuccess: () => {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['org', 'member-permissions', userId] })
      setTimeout(() => setSaved(false), 2000)
    },
  })

  function toggle(perm: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 28, width: 560, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Map Permissions</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{userName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>&#x2715;</button>
        </div>

        {isLoading ? <div className="spinner" style={{ margin: '40px auto' }} /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {PERMISSION_MODULES.map(mod => (
              <div key={mod.module}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-dim)', marginBottom: 12 }}>
                  {mod.module}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {mod.submodules.map(sub => (
                    <div key={sub.name} style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--text)' }}>{sub.name}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sub.permissions.map(p => (
                          <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                            <input
                              type="checkbox"
                              checked={selected.has(p.key)}
                              onChange={() => toggle(p.key)}
                              style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                            />
                            <span style={{ color: 'var(--text-muted)' }}>{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
            {saved ? 'Saved' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  )
}

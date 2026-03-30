import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useQuery, useMutation } from '@tanstack/react-query'
import { meApi, orgApi, bugApi } from '../api/orgs'
import { getOrgSlug, getMainDomainUrl } from '../utils/subdomain'
import {
  LayoutDashboard, Layers, Rocket, GitBranch, Activity,
  Users, Building2, Bug, ChevronRight, Sun, Moon,
  LogOut, Menu, CheckCircle2, X, AlertCircle, ScrollText,
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const orgSlug = getOrgSlug()

  const { data: slugData } = useQuery({
    queryKey: ['org-by-slug', orgSlug],
    queryFn: () => fetch(`/api/public/orgs/by-slug/${orgSlug}`).then(r => r.json()),
    enabled: !!orgSlug,
    staleTime: Infinity,
  })
  const orgId = slugData?.org_id as string | undefined

  const { data: servicesData } = useQuery({
    queryKey: ['orgs', orgId, 'services'],
    queryFn: () => orgApi.getServices(orgId!),
    enabled: !!orgId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const orgRole = servicesData?.role as string | undefined

  const sidebarRole = user?.role === 'super_admin'
    ? 'Super Admin'
    : orgSlug
      ? (orgRole ? orgRole.charAt(0).toUpperCase() + orgRole.slice(1) : '')
      : ''

  const [bugOpen, setBugOpen] = useState(false)
  const [fabHovered, setFabHovered] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark' } catch { return 'dark' }
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const iconSize = 15

  return (
    <div className="layout">
      {/* Mobile top bar */}
      <header className="mobile-header">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setSidebarOpen(o => !o)}
          style={{ padding: '6px 8px' }}
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Konfig
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          style={{ padding: '6px 8px' }}
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <img src="/konfig.svg" alt="K" width={28} height={28} />
            <h1>onfig</h1>
          </div>
          <p>Configuration Management</p>
        </div>

        <nav className="sidebar-nav">
          {!orgSlug && (
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon"><LayoutDashboard size={iconSize} /></span>
              Dashboard
            </NavLink>
          )}

          {orgSlug ? (
            <>
              <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon"><Layers size={iconSize} /></span>
                Services
              </NavLink>
              <NavLink to="/rollouts" className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon"><Rocket size={iconSize} /></span>
                Rollouts
              </NavLink>
              <NavLink to="/schemas" className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon"><GitBranch size={iconSize} /></span>
                Schemas
              </NavLink>
              <NavLink to="/live" className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon"><Activity size={iconSize} /></span>
                Live Updates
              </NavLink>
              {(orgRole === 'admin' || user?.role === 'super_admin') && (
                <NavLink to="/users" className={({ isActive }) => (isActive ? 'active' : '')}>
                  <span className="nav-icon"><Users size={iconSize} /></span>
                  Members
                </NavLink>
              )}
            </>
          ) : user?.role === 'super_admin' ? (
            <>
              <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon"><Building2 size={iconSize} /></span>
                Organizations
              </NavLink>
              <NavLink to="/admin/users" end className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon"><Users size={iconSize} /></span>
                Users
              </NavLink>
              <NavLink to="/admin/bugs" end className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon"><Bug size={iconSize} /></span>
                Issue Reports
              </NavLink>
              <NavLink to="/admin/logs" end className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon"><ScrollText size={iconSize} /></span>
                Logs
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/orgs" className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon"><Building2 size={iconSize} /></span>
                Organizations
                <InviteBadge />
              </NavLink>
              <NavLink to="/services" className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon"><Layers size={iconSize} /></span>
                Services
              </NavLink>
              <NavLink to="/rollouts" className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon"><Rocket size={iconSize} /></span>
                Rollouts
              </NavLink>
              <NavLink to="/schemas" className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon"><GitBranch size={iconSize} /></span>
                Schemas
              </NavLink>
              <NavLink to="/live" className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon"><Activity size={iconSize} /></span>
                Live Updates
              </NavLink>

              <div style={{ marginTop: 16, marginBottom: 6, padding: '0 10px' }}>
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text-dim)' }}>
                  Recent
                </span>
              </div>
              <ServiceQuickLinks />
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {orgSlug && (
            <button
              className="theme-toggle"
              onClick={() => { window.location.href = getMainDomainUrl() }}
              title="Go to personal workspace"
              style={{ color: 'var(--accent)', marginBottom: 4 }}
            >
              ← Personal
            </button>
          )}
          <button
            className="theme-toggle"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark'
              ? <><Sun size={13} /> Light mode</>
              : <><Moon size={13} /> Dark mode</>
            }
          </button>

          {user && (
            <div className="sidebar-user" style={{ cursor: 'pointer', marginTop: 6 }} onClick={() => navigate('/profile')}>
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="avatar"
                  style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }}
                />
              ) : (
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11,
                }}>
                  {(user.name ?? '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              )}
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user.name}</span>
                {sidebarRole && <span className="sidebar-user-role">{sidebarRole}</span>}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                title="Sign out"
                onClick={async (e) => { e.stopPropagation(); await logout(); navigate('/login') }}
                style={{ padding: '4px', marginLeft: 'auto', flexShrink: 0 }}
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        {children}
        <footer style={{
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--text-dim)',
          letterSpacing: '0.2px',
        }}>
          © {new Date().getFullYear()} Saptarshi Ghosh · Konfig
        </footer>
      </main>

      {/* Floating issue report button */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
        {fabHovered && (
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#ef4444',
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '5px 10px', whiteSpace: 'nowrap',
            pointerEvents: 'none',
            animation: 'fadeInLeft 0.15s ease',
          }}>
            Report Bug
          </span>
        )}
        <button
          onClick={() => setBugOpen(true)}
          onMouseEnter={() => setFabHovered(true)}
          onMouseLeave={() => setFabHovered(false)}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: fabHovered ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${fabHovered ? '#ef4444' : 'rgba(239,68,68,0.3)'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: fabHovered ? '0 4px 20px rgba(239,68,68,0.3)' : '0 4px 16px rgba(239,68,68,0.15)',
            transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
            color: '#ef4444',
          }}
        >
          <AlertCircle size={16} />
        </button>
      </div>

      {bugOpen && <BugReportModal onClose={() => setBugOpen(false)} />}
    </div>
  )
}

function BugReportModal({ onClose }: { onClose: () => void }) {
  const [issueType, setIssueType] = useState('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = useMutation({
    mutationFn: () => bugApi.submit(issueType, title, description),
    onSuccess: () => setSubmitted(true),
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 24, width: 460, maxWidth: '95vw', boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Report an Issue</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
            <X size={16} />
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle2 size={40} style={{ color: 'var(--success)', margin: '0 auto 14px' }} />
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>Report submitted</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>We'll review it shortly.</div>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Type</label>
              <select className="form-control" value={issueType} onChange={e => setIssueType(e.target.value)}>
                <option value="bug">Bug</option>
                <option value="feature_request">Feature Request</option>
                <option value="performance">Performance</option>
                <option value="ui_ux">UI / UX</option>
                <option value="security">Security</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Title</label>
              <input
                className="form-control"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="One-line summary"
                autoFocus
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Description</label>
              <textarea
                className="form-control"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Steps to reproduce, expected vs actual behaviour…"
                rows={4}
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
              />
            </div>
            {submit.isError && (
              <div className="auth-error">Submission failed. Please try again.</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!title.trim() || !description.trim() || submit.isPending}
                onClick={() => submit.mutate()}
              >
                {submit.isPending ? <span className="spinner spinner-sm" /> : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InviteBadge() {
  const { data } = useQuery({
    queryKey: ['me', 'invites'],
    queryFn: meApi.listInvites,
    refetchInterval: 60000,
    staleTime: 30000,
  })
  const count = data?.invites?.length ?? 0
  if (count === 0) return null
  return (
    <span style={{
      marginLeft: 'auto', background: 'var(--accent)', color: '#fff',
      borderRadius: 10, fontSize: 10, fontWeight: 700,
      padding: '1px 6px', minWidth: 16, textAlign: 'center',
      lineHeight: '16px',
    }}>
      {count}
    </span>
  )
}

function ServiceQuickLinks() {
  useLocation()
  const recentServices: string[] = (() => {
    try { return JSON.parse(localStorage.getItem('recentServices') || '[]') } catch { return [] }
  })()

  if (recentServices.length === 0) {
    return (
      <div style={{ padding: '4px 10px', fontSize: 12, color: 'var(--text-dim)' }}>
        No recent services
      </div>
    )
  }

  return (
    <>
      {recentServices.slice(0, 5).map((svc: string) => (
        <NavLink
          key={svc}
          to={`/services/${encodeURIComponent(svc)}`}
          className={({ isActive }) => (isActive ? 'active' : '')}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
        >
          <span className="nav-icon"><ChevronRight size={12} /></span>
          {svc}
        </NavLink>
      ))}
    </>
  )
}

import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
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

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="layout">
      {/* Mobile top bar */}
      <header className="mobile-header">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setSidebarOpen(o => !o)}
          style={{ padding: '6px 8px', fontSize: 18, lineHeight: 1 }}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Konfig
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          style={{ padding: '6px 8px', fontSize: 16 }}
          title="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {/* Backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <h1>Konfig</h1>
          <p>Configuration Management</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">◈</span>
            Dashboard
          </NavLink>
          <NavLink to="/services" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">🗂️</span>
            Services
          </NavLink>
          <NavLink to="/rollouts" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">🚀</span>
            Rollouts
          </NavLink>
          <NavLink to="/schemas" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">⬡</span>
            Schemas
          </NavLink>
          <NavLink to="/live" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">◉</span>
            Live Updates
          </NavLink>

          <div style={{ marginTop: 16, marginBottom: 8, padding: '0 2px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-dim)', padding: '0 8px' }}>
              Recent Services
            </div>
          </div>
          <ServiceQuickLinks />
        </nav>
        <div className="sidebar-footer">
          <button
            className="theme-toggle"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}

function ServiceQuickLinks() {
  useLocation() // re-render on route change so localStorage is re-read
  const recentServices: string[] = (() => {
    try {
      return JSON.parse(localStorage.getItem('recentServices') || '[]')
    } catch {
      return []
    }
  })()

  if (recentServices.length === 0) {
    return (
      <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--text-dim)' }}>
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
          <span className="nav-icon" style={{ fontSize: 11 }}>▸</span>
          {svc}
        </NavLink>
      ))}
    </>
  )
}

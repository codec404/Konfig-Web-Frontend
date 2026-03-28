import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ServicePage from './pages/ServicePage'
import ServicesPage from './pages/ServicesPage'
import RolloutsPage from './pages/RolloutsPage'
import SchemasPage from './pages/SchemasPage'
import LiveUpdates from './components/LiveUpdates'
import ConfigDetailPage from './pages/ConfigDetailPage'
import LoginPage from './pages/LoginPage'
import SuperAdminPage from './pages/SuperAdminPage'
import OrgsPage from './pages/OrgsPage'
import OrgDashboardPage from './pages/OrgDashboardPage'
import ProfilePage from './pages/ProfilePage'
import { useAuth } from './contexts/AuthContext'
import { getOrgSlug } from './utils/subdomain'

function AdminRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role === 'super_admin') return <SuperAdminPage tab="orgs" />
  return null
}

function SuperAdminUsersRoute() {
  const { user } = useAuth()
  if (!user || user.role !== 'super_admin') return null
  return <SuperAdminPage tab="users" />
}

function SuperAdminBugsRoute() {
  const { user } = useAuth()
  if (!user || user.role !== 'super_admin') return null
  return <SuperAdminPage tab="bugs" />
}

function SuperAdminLogsRoute() {
  const { user } = useAuth()
  if (!user || user.role !== 'super_admin') return null
  return <SuperAdminPage tab="logs" />
}

export default function App() {
  const orgSlug = getOrgSlug()

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          orgSlug ? (
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/services/:serviceName/configs/:configId" element={<ConfigDetailPage />} />
                  <Route path="/services/:serviceName" element={<ServicePage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/*" element={<OrgDashboardPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          ) : (
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/services/:serviceName" element={<ServicePage />} />
                  <Route path="/services/:serviceName/configs/:configId" element={<ConfigDetailPage />} />
                  <Route path="/rollouts" element={<RolloutsPage />} />
                  <Route path="/schemas" element={<SchemasPage />} />
                  <Route path="/live" element={<LiveUpdates />} />
                  <Route path="/admin" element={<AdminRoute />} />
                  <Route path="/admin/users" element={<SuperAdminUsersRoute />} />
                  <Route path="/admin/bugs" element={<SuperAdminBugsRoute />} />
                  <Route path="/admin/logs" element={<SuperAdminLogsRoute />} />
                  <Route path="/orgs" element={<OrgsPage />} />
                  <Route path="/orgs/:orgId" element={<OrgDashboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          )
        } />
      </Routes>
    </AuthProvider>
  )
}

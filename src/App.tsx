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
import AdminPage from './pages/AdminPage'
import OrgsPage from './pages/OrgsPage'
import OrgDashboardPage from './pages/OrgDashboardPage'
import { useAuth } from './contexts/AuthContext'

function AdminRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role === 'super_admin') return <SuperAdminPage tab="orgs" />
  if (user.role === 'admin') return <AdminPage />
  return null
}

function SuperAdminUsersRoute() {
  const { user } = useAuth()
  if (!user || user.role !== 'super_admin') return null
  return <SuperAdminPage tab="users" />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
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
                <Route path="/orgs" element={<OrgsPage />} />
                <Route path="/orgs/:orgId" element={<OrgDashboardPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  )
}

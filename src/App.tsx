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
import SignupPage from './pages/SignupPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
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
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  )
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import StudentLayout from './pages/student/StudentLayout'
import StudentDashboard from './pages/student/StudentDashboard'
import StudentCourses from './pages/student/StudentCourses'
import StudentLesson from './pages/student/StudentLesson'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminStudents from './pages/admin/AdminStudents'
import AdminCourses from './pages/admin/AdminCourses'
import AdminProgress from './pages/admin/AdminProgress'
import './index.css'

function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <div className="loading-screen"><div><div className="spinner" /><div>Cargando...</div></div></div>
  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && profile?.role !== 'admin') return <Navigate to="/student" replace />
  if (!requireAdmin && profile?.role === 'admin') return <Navigate to="/admin" replace />

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Student routes */}
          <Route path="/student" element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
            <Route index element={<StudentDashboard />} />
            <Route path="cursos" element={<StudentCourses />} />
            <Route path="curso/:courseId/leccion/:lessonId" element={<StudentLesson />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="estudiantes" element={<AdminStudents />} />
            <Route path="cursos" element={<AdminCourses />} />
            <Route path="progreso" element={<AdminProgress />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

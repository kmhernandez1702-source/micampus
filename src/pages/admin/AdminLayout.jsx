import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'

const NAV = [
  {
    label: 'Administración',
    links: [
      { to: '/admin', end: true, icon: '📊', label: 'Dashboard' },
      { to: '/admin/estudiantes', icon: '👥', label: 'Estudiantes' },
      { to: '/admin/cursos', icon: '📚', label: 'Cursos' },
      { to: '/admin/progreso', icon: '📈', label: 'Progreso global' },
    ]
  }
]

export default function AdminLayout() {
  return (
    <div className="app-layout">
      <Sidebar items={NAV} />
      <main className="main-area">
        <Outlet />
      </main>
    </div>
  )
}

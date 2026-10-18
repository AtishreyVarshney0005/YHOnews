import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, LogOut } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import Socials from '../components/Socials.jsx'

const MENU = [
  { label: 'Dashboard', to: '/admin', Icon: LayoutDashboard, end: true },
  { label: 'Articles', to: '/admin/articles', Icon: FileText },
]

export default function AdminLayout() {
  const navigate = useNavigate()

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
    sessionStorage.removeItem('yhu_admin_authenticated')
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin">
      <aside className="sidebar">
        <Logo light tagline="Your World, Your News." />
        <nav>
          {MENU.map(({ label, to, Icon, end }) => (
            <NavLink key={label} to={to} end={end}><Icon size={20} /> {label}</NavLink>
          ))}
          <hr />
          <button type="button" className="sidebar-logout" onClick={logout}><LogOut size={20} /> Logout</button>
        </nav>
      </aside>

      <div className="admin-main">
        <div className="admin-top">
          <div>
            <h1>Admin Panel <small>(Dashboard &amp; Add News)</small></h1>
            <p className="muted">Manage your news website from here.</p>
          </div>
          <div className="admin-user">
            <span className="avatar">A</span>
            <div><b>Admin</b><small>Administrator</small></div>
          </div>
        </div>
        <div className="admin-content"><Outlet /></div>
        <footer className="admin-foot">
          <div className="admin-foot-inner">
            <span className="admin-copyright">© 2026 YHO News. All rights reserved.</span>
            <nav className="admin-foot-links" aria-label="Admin footer">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms &amp; Conditions</Link>
            </nav>
            <Socials />
          </div>
        </footer>
      </div>
    </div>
  )
}

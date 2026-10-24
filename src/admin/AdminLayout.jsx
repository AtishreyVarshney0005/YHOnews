import { useRef } from 'react'
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { ExternalLink, LayoutDashboard, FileText, LogOut, Plus } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import Socials from '../components/Socials.jsx'
import PageMeta from '../components/PageMeta.jsx'
import useScrollReveal from '../hooks/useScrollReveal.js'

const MENU = [
  { label: 'Dashboard', to: '/admin', Icon: LayoutDashboard, end: true },
  { label: 'Articles', to: '/admin/articles', Icon: FileText },
  { label: 'Add News', to: '/admin/add', Icon: Plus },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const contentRef = useRef(null)
  useScrollReveal(contentRef)
  const pageTitle = location.pathname === '/admin'
    ? 'Dashboard'
    : location.pathname === '/admin/articles'
      ? 'Articles'
      : location.pathname.endsWith('/edit')
        ? 'Edit article'
        : 'Add news'

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
    sessionStorage.removeItem('yhu_admin_authenticated')
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin">
      <PageMeta title="Admin Panel | YHO News" description="Manage YHO News articles." robots="noindex, nofollow" />
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo light tagline="Your World, Your News." />
          <span className="sidebar-kicker">PUBLISHING WORKSPACE</span>
        </div>
        <nav>
          <span className="sidebar-section-label">MENU</span>
          {MENU.map(({ label, to, Icon, end }) => (
            <NavLink key={label} to={to} end={end}><Icon size={20} /> {label}</NavLink>
          ))}
          <hr />
          <Link to="/" target="_blank" rel="noreferrer" className="sidebar-site-link"><ExternalLink size={18} /> View website</Link>
          <button type="button" className="sidebar-logout" onClick={logout}><LogOut size={20} /> Logout</button>
        </nav>
      </aside>

      <div className="admin-main">
        <div className="admin-top">
          <div className="admin-page-heading">
            <p className="admin-breadcrumb"><span>Newsroom</span><span aria-hidden="true">/</span><b>{pageTitle}</b></p>
            <h1>{pageTitle}</h1>
            <p className="muted">Create, publish, and manage your YHO News stories.</p>
          </div>
          <div className="admin-user">
            <span className="avatar">A</span>
            <div><b>Admin</b><small>Administrator</small></div>
          </div>
        </div>
        <div className="admin-content" ref={contentRef}><Outlet /></div>
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

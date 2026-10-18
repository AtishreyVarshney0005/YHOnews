import { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import SiteLayout from './components/SiteLayout.jsx'
import Home from './pages/Home.jsx'
import Category from './pages/Category.jsx'
import Article from './pages/Article.jsx'
import Search from './pages/Search.jsx'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import { Privacy, Terms } from './pages/Legal.jsx'
import AdminLayout from './admin/AdminLayout.jsx'
import AdminLogin from './admin/AdminLogin.jsx'
import Dashboard from './admin/Dashboard.jsx'
import AddNews from './admin/AddNews.jsx'
import Articles from './admin/Articles.jsx'
import NotFound from './pages/NotFound.jsx'

const ADMIN_SESSION_KEY = 'yhu_admin_authenticated'

function RequireAdmin() {
  const location = useLocation()
  const [authorized, setAuthorized] = useState(null)

  useEffect(() => {
    let active = true
    fetch('/api/admin/session')
      .then((response) => {
        if (!response.ok) sessionStorage.removeItem(ADMIN_SESSION_KEY)
        else sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
        if (active) setAuthorized(response.ok)
      })
      .catch(() => { if (active) setAuthorized(false) })
    return () => { active = false }
  }, [])

  if (authorized === null) return <main className="admin-login-page"><p>Checking admin access...</p></main>
  if (!authorized) return <Navigate to="/admin/login" replace state={{ from: location }} />

  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/category/:slug" element={<Category />} />
        <Route path="/article/:id" element={<Article />} />
        <Route path="/search" element={<Search />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="add" element={<AddNews />} />
          <Route path="articles" element={<Articles />} />
          <Route path="articles/:id/edit" element={<AddNews />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}

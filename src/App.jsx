import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import SiteLayout from './components/SiteLayout.jsx'

const Home = lazy(() => import('./pages/Home.jsx'))
const Category = lazy(() => import('./pages/Category.jsx'))
const Article = lazy(() => import('./pages/Article.jsx'))
const Search = lazy(() => import('./pages/Search.jsx'))
const About = lazy(() => import('./pages/About.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const Privacy = lazy(() => import('./pages/Legal.jsx').then((module) => ({ default: module.Privacy })))
const Terms = lazy(() => import('./pages/Legal.jsx').then((module) => ({ default: module.Terms })))
const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'))
const AdminLogin = lazy(() => import('./admin/AdminLogin.jsx'))
const Dashboard = lazy(() => import('./admin/Dashboard.jsx'))
const AddNews = lazy(() => import('./admin/AddNews.jsx'))
const Articles = lazy(() => import('./admin/Articles.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

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

  if (authorized === null) return null
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
      <Route path="/admin/login" element={<Suspense fallback={null}><AdminLogin /></Suspense>} />
      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<Suspense fallback={null}><AdminLayout /></Suspense>}>
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

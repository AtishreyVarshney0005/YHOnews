import { useEffect, useState } from 'react'
import { LockKeyhole, LogIn } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { readApiResponse } from './api.js'

const ADMIN_SESSION_KEY = 'yhu_admin_authenticated'

export default function AdminLogin() {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/admin/session').then((response) => {
      if (active && response.ok) navigate('/admin', { replace: true })
    }).catch(() => {})
    return () => { active = false }
  }, [navigate])

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      await readApiResponse(response, 'Unable to sign in.')

      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
      const destination = location.state?.from
      navigate(destination ? `${destination.pathname}${destination.search || ''}${destination.hash || ''}` : '/admin', { replace: true })
    } catch (loginError) {
      setError(loginError.message || 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Logo tagline="Admin portal" />
        <div className="admin-login-heading">
          <span className="admin-login-icon"><LockKeyhole size={22} /></span>
          <div>
            <h1>Admin sign in</h1>
            <p className="muted">Sign in to manage YHO News.</p>
          </div>
        </div>
        <form className="admin-login-form" onSubmit={submit}>
          <label htmlFor="admin-email">Email address</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <p className="admin-login-error" role="alert">{error}</p>}
          <button type="submit" className="btn-red admin-login-submit" disabled={submitting}><LogIn size={17} /> {submitting ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <Link to="/" className="admin-login-back">Back to YHO News</Link>
      </section>
    </main>
  )
}

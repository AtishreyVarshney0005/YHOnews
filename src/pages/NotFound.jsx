import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="card not-found">
      <span className="not-found-code">404</span>
      <h1 className="accent">Page not found</h1>
      <p className="muted">The page you're looking for doesn't exist or may have moved.</p>
      <Link className="btn-red" to="/">Back to homepage</Link>
    </section>
  )
}

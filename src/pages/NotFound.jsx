import { Link } from 'react-router-dom'
import PageMeta from '../components/PageMeta.jsx'

export default function NotFound() {
  return (
    <>
      <PageMeta title="Page not found | YHO News" description="The requested YHO News page could not be found." robots="noindex, follow" />
      <section className="card not-found">
        <span className="not-found-code">404</span>
        <h1 className="accent">Page not found</h1>
        <p className="muted">The page you're looking for doesn't exist or may have moved.</p>
        <Link className="btn-red" to="/">Back to homepage</Link>
      </section>
    </>
  )
}

import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Search, Calendar, Clock, Menu, X } from 'lucide-react'
import Logo from './Logo.jsx'
import Socials from './Socials.jsx'
import { PUBLISHABLE_CATEGORIES, slugify } from '../data.js'
import useScrollReveal from '../hooks/useScrollReveal.js'

const NAV_CATEGORIES = PUBLISHABLE_CATEGORIES
const NAV_ITEMS = [
  { label: 'Home', to: '/', home: true, preserveRange: true },
  ...NAV_CATEGORIES.map((category) => ({
    label: category,
    to: `/category/${slugify(category)}`,
    preserveRange: true,
  })).sort((first, second) => first.label.localeCompare(second.label)),
  { label: 'About Us', to: '/about' },
  { label: 'Contact Us', to: '/contact', contact: true },
]
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
})
const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
})

function Header() {
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const navigate = useNavigate()
  const rangeQuery = params.get('range') ? `?range=${encodeURIComponent(params.get('range'))}` : ''

  useEffect(() => {
    setQ(params.get('q') || '')
  }, [params])

  useEffect(() => {
    const clockTimer = window.setInterval(() => setNow(new Date()), 60 * 1000)
    return () => window.clearInterval(clockTimer)
  }, [])

  const submit = (e) => {
    e.preventDefault()
    if (q.trim()) {
      setOpen(false)
      navigate(`/search?q=${encodeURIComponent(q.trim())}${rangeQuery ? `&${rangeQuery.slice(1)}` : ''}`)
    }
  }

  return (
    <header>
      <div className="topbar container">
        <button
          className="icon-btn mobile-only"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="main-navigation"
        >
          {open ? <X /> : <Menu />}
        </button>
        <Logo />
        <form className="search" onSubmit={submit} role="search" aria-label="Search news">
          <input type="search" aria-label="Search news, topics, and keywords" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search news, topics, keywords..." />
          <button type="submit" aria-label="Submit search"><Search size={20} /></button>
        </form>
        <div className="datebox">
          <span><Calendar size={13} /> {dateFormatter.format(now)}</span>
          <span className="muted"><Clock size={13} /> {timeFormatter.format(now)} IST</span>
        </div>
        <Socials />
      </div>
      <nav id="main-navigation" className={`mainnav ${open ? 'open' : ''}`}>
        <div className="container navrow" onClick={() => setOpen(false)}>
          {NAV_ITEMS.map(({ label, to, home, preserveRange, contact }) => (
            <NavLink
              key={label}
              to={`${to}${preserveRange ? rangeQuery : ''}`}
              end={home}
              className={({ isActive }) => (contact && isActive ? 'active contact' : undefined)}
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  )
}

function Footer() {
  const half = Math.ceil(NAV_CATEGORIES.length / 2)
  const [params] = useSearchParams()
  const footerRef = useRef(null)
  useScrollReveal(footerRef)
  const rangeQuery = params.get('range') ? `?range=${encodeURIComponent(params.get('range'))}` : ''
  return (
    <footer className="footer" ref={footerRef}>
      <div className="container footgrid">
        <div>
          <Logo light tagline="Your World, Your News. Stay Informed." />
          <p className="footer-about">YHO News is your digital destination for the latest stories from India and around the world. Explore news across business, technology, sports, entertainment, education and lifestyle—all in one place.</p>
          <Link className="footer-about-link" to="/about">Discover what YHO News is about <span aria-hidden="true">→</span></Link>
        </div>
        <div>
          <h4>Explore</h4>
          <Link to={`/${rangeQuery}`}>Home</Link>
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div>
          <h4>Categories</h4>
          <div className="catcols">
            {[NAV_CATEGORIES.slice(0, half), NAV_CATEGORIES.slice(half)].map((col, i) => (
              <div key={i}>
                {col.map((c) => <Link key={c} to={`/category/${slugify(c)}${rangeQuery}`}>{c}</Link>)}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4>Follow Us</h4>
          <Socials showFooterLinks />
          <p className="footer-contact-copy">Have a story tip or feedback?</p>
          <Link className="footer-contact-link" to="/contact">Get in touch <span aria-hidden="true">→</span></Link>
        </div>
      </div>
      <div className="copyright">
        <div className="container copyright-inner">
          <span>© 2026 YHO News. News that keeps you informed.</span>
          <nav className="copyright-links" aria-label="Legal information">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export default function SiteLayout() {
  const { pathname } = useLocation()
  const pageRef = useRef(null)
  useScrollReveal(pageRef, pathname)
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <>
      <Header />
      <main className="container page" ref={pageRef}>
        <Suspense fallback={null}><Outlet /></Suspense>
      </main>
      <Footer />
    </>
  )
}

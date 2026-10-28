import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Search, Calendar, Clock, Menu, X, Sun, Cloud, CloudSun, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Info } from 'lucide-react'
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

function describeWeather(code) {
  if (code === 0) return { label: 'Clear sky', Icon: Sun }
  if ([1, 2].includes(code)) return { label: 'Partly cloudy', Icon: CloudSun }
  if (code === 3) return { label: 'Overcast', Icon: Cloud }
  if ([45, 48].includes(code)) return { label: 'Fog', Icon: CloudFog }
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Drizzle', Icon: CloudDrizzle }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Rain', Icon: CloudRain }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', Icon: CloudSnow }
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', Icon: CloudLightning }
  return { label: 'Current conditions', Icon: Cloud }
}

function DelhiWeather() {
  const [weather, setWeather] = useState({ status: 'loading', current: null })

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const loadWeather = async () => {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&current=temperature_2m,weather_code&timezone=Asia%2FKolkata',
          { signal: controller.signal },
        )
        if (!response.ok) throw new Error(`Weather service returned ${response.status}.`)
        const data = await response.json()
        const temperature = data.current?.temperature_2m
        const code = data.current?.weather_code
        if (!Number.isFinite(temperature) || !Number.isInteger(code)) {
          throw new Error('Weather service returned incomplete Delhi weather data.')
        }
        if (active) setWeather({ status: 'ready', current: { temperature, ...describeWeather(code) } })
      } catch (error) {
        if (error.name !== 'AbortError' && active) {
          console.error('Could not load Delhi weather:', error)
          setWeather({ status: 'error', current: null })
        }
      }
    }

    loadWeather()
    const refreshTimer = window.setInterval(loadWeather, 15 * 60 * 1000)
    return () => {
      active = false
      controller.abort()
      window.clearInterval(refreshTimer)
    }
  }, [])

  if (weather.status === 'loading') {
    return (
      <div className="weatherbox weatherbox-state" role="status">
        <CloudSun size={20} aria-hidden="true" />
        <span className="weatherbox-copy">
          <strong>Delhi</strong>
          <span className="weatherbox-condition">Loading weather…</span>
        </span>
      </div>
    )
  }
  if (weather.status === 'error') {
    return (
      <div className="weatherbox weatherbox-state" role="status">
        <Cloud size={20} aria-hidden="true" />
        <span className="weatherbox-copy">
          <strong>Delhi</strong>
          <span className="weatherbox-condition">Weather unavailable</span>
        </span>
      </div>
    )
  }

  const { Icon, temperature, label } = weather.current
  return (
    <div className="weatherbox" role="status" aria-label={`Delhi weather: ${label}, ${Math.round(temperature)} degrees Celsius`}>
      <Icon size={24} aria-hidden="true" />
      <span className="weatherbox-copy">
        <strong>Delhi <b>{Math.round(temperature)}°C</b></strong>
        <span className="weatherbox-condition">
          {label}
          <a href="https://open-meteo.com/en/licence" target="_blank" rel="noopener noreferrer" aria-label="Weather data by Open-Meteo, licensed under CC BY 4.0" title="Weather data by Open-Meteo, licensed under CC BY 4.0">
            <Info size={12} aria-hidden="true" />
          </a>
        </span>
      </span>
    </div>
  )
}

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
        <DelhiWeather />
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
        <Suspense fallback={(
          <div className="article-skeleton card" role="status" aria-label="Loading page">
            <span className="article-skeleton-image" />
            <span className="article-skeleton-title" />
            <span className="article-skeleton-line" />
            <span className="article-skeleton-line short" />
          </div>
        )}><Outlet /></Suspense>
      </main>
      <Footer />
    </>
  )
}

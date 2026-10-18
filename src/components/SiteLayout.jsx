import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Search, Calendar, Clock, Sun, Moon, Cloud, CloudSun, CloudMoon, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Menu } from 'lucide-react'
import Logo from './Logo.jsx'
import Socials from './Socials.jsx'
import { CATEGORIES, slugify } from '../data.js'

const NAV_CATEGORIES = CATEGORIES.filter((category) => !['India', 'World', 'Politics', 'Health'].includes(category))
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
})
const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
})

function weatherDescription(code) {
  if (code === 0) return 'Clear sky'
  if (code === 1) return 'Mainly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Foggy'
  if (code <= 55) return 'Drizzle'
  if (code <= 57) return 'Freezing drizzle'
  if (code <= 65) return 'Rain'
  if (code <= 67) return 'Freezing rain'
  if (code <= 75) return 'Snowfall'
  if (code === 77) return 'Snow grains'
  if (code <= 82) return 'Rain showers'
  if (code <= 86) return 'Snow showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Current conditions'
}

function weatherIcon(code, isDay) {
  if (code === 0) return isDay ? Sun : Moon
  if (code === 1 || code === 2) return isDay ? CloudSun : CloudMoon
  if (code === 3) return Cloud
  if (code === 45 || code === 48) return CloudFog
  if (code <= 57) return CloudDrizzle
  if (code <= 67 || (code >= 80 && code <= 82)) return CloudRain
  if (code <= 77 || (code >= 85 && code <= 86)) return CloudSnow
  if (code <= 99) return CloudLightning
  return CloudSun
}

const weatherTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
})

function Header() {
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [weather, setWeather] = useState({ temperature: null, condition: 'Loading weather', code: null, isDay: true, updatedAt: null })
  const navigate = useNavigate()
  const rangeQuery = params.get('range') ? `?range=${encodeURIComponent(params.get('range'))}` : ''

  useEffect(() => {
    setQ(params.get('q') || '')
  }, [params])

  useEffect(() => {
    let active = true
    const clockTimer = window.setInterval(() => setNow(new Date()), 1000)
    const loadWeather = async () => {
      try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.209&current=temperature_2m,apparent_temperature,weather_code,is_day&timezone=Asia%2FKolkata')
        if (!response.ok) throw new Error('Weather request failed')
        const { current } = await response.json()
        if (active && Number.isFinite(current?.temperature_2m)) {
          const updateTime = new Date(`${current.time}:00+05:30`)
          setWeather({
            temperature: current.temperature_2m,
            feelsLike: current.apparent_temperature,
            condition: weatherDescription(current.weather_code),
            code: current.weather_code,
            isDay: current.is_day === 1,
            updatedAt: Number.isNaN(updateTime.getTime()) ? null : updateTime,
          })
        }
      } catch {
        if (active) setWeather({ temperature: null, condition: 'Unavailable', code: null, isDay: true, updatedAt: null })
      }
    }

    loadWeather()
    const weatherTimer = window.setInterval(loadWeather, 10 * 60 * 1000)
    return () => {
      active = false
      window.clearInterval(clockTimer)
      window.clearInterval(weatherTimer)
    }
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
        <button className="icon-btn mobile-only" onClick={() => setOpen(!open)} aria-label="Menu"><Menu /></button>
        <Logo />
        <form className="search" onSubmit={submit} role="search" aria-label="Search news">
          <input type="search" aria-label="Search news, topics, and keywords" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search news, topics, keywords..." />
          <button type="submit" aria-label="Submit search"><Search size={20} /></button>
        </form>
        <div className="datebox">
          <span><Calendar size={13} /> {dateFormatter.format(now)}</span>
          <span className="muted"><Clock size={13} /> {timeFormatter.format(now)} IST</span>
        </div>
        <div className="weather" aria-live="polite" title={`Live weather in New Delhi${weather.updatedAt ? `, updated ${weatherTimeFormatter.format(weather.updatedAt)} IST` : ''}${Number.isFinite(weather.feelsLike) ? `, feels like ${weather.feelsLike}°C` : ''}`}>
          {(() => { const Icon = weatherIcon(weather.code, weather.isDay); return <Icon size={28} color="#f5a623" /> })()}
          <div><b>{weather.temperature === null ? '--' : `${weather.temperature.toFixed(1)}°C`}</b><small>Delhi · {weather.condition}{weather.updatedAt ? ` · ${weatherTimeFormatter.format(weather.updatedAt)}` : ''}</small></div>
        </div>
        <Socials />
      </div>
      <nav className={`mainnav ${open ? 'open' : ''}`}>
        <div className="container navrow" onClick={() => setOpen(false)}>
          <NavLink to={`/${rangeQuery}`} end>Home</NavLink>
          {NAV_CATEGORIES.map((c) => (
            <NavLink key={c} to={`/category/${slugify(c)}${rangeQuery}`}>{c}</NavLink>
          ))}
          <NavLink to="/about">About Us</NavLink>
          <NavLink to="/contact" className={({ isActive }) => (isActive ? 'active contact' : '')}>Contact Us</NavLink>
        </div>
      </nav>
    </header>
  )
}

function Footer() {
  const half = Math.ceil(NAV_CATEGORIES.length / 2)
  const [params] = useSearchParams()
  const rangeQuery = params.get('range') ? `?range=${encodeURIComponent(params.get('range'))}` : ''
  return (
    <footer className="footer">
      <div className="container footgrid">
        <div>
          <Logo light tagline="Your World, Your News. Stay Informed." />
        </div>
        <div>
          <h4>Quick Links</h4>
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
          <Socials />
        </div>
      </div>
      <div className="copyright">
        <div className="container copyright-inner">
          <span>© 2026 YHO News. All rights reserved.</span>
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
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <>
      <Header />
      <main className="container page">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

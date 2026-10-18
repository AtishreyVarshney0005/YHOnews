import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BarChart3, Settings, Trophy, Drama, GraduationCap, Heart, ChevronLeft, ChevronRight, Clock, User, ArrowRight } from 'lucide-react'
import { SectionTitle, Row, StoryLink } from '../components/Bits.jsx'
import NewsDateFilter from '../components/NewsDateFilter.jsx'
import { filterArticlesByDateRange, normalizeNewsDateRange } from '../data.js'

const QUICK = [
  { label: 'Business', Icon: BarChart3, color: '#16a34a', to: '/category/business' },
  { label: 'Technology', Icon: Settings, color: '#7c3aed', to: '/category/technology' },
  { label: 'Sports', Icon: Trophy, color: '#f97316', to: '/category/sports' },
  { label: 'Entertainment', Icon: Drama, color: '#e8141c', to: '/category/entertainment' },
  { label: 'Education', Icon: GraduationCap, color: '#245bd5', to: '/category/education' },
  { label: 'Lifestyle', Icon: Heart, color: '#df2434', to: '/category/lifestyle' },
]

const ALLOWED_CATEGORIES = new Set(['Business', 'Technology', 'Sports', 'Entertainment', 'Education', 'Lifestyle'])

function formatAge(publishedAt) {
  const elapsed = Math.max(0, Date.now() - new Date(publishedAt).getTime())
  const minutes = Math.floor(elapsed / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.floor(hours / 24)} days ago`
}

function mapArticle(article, index) {
  const publishedAt = article.publishedAt
  const text = article.description || article.content?.replace(/\s*\[\+\d+ chars\]$/, '') || ''
  return {
    id: `${publishedAt}-${index}`,
    title: article.title,
    category: article.category,
    ago: formatAge(publishedAt),
    date: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(publishedAt)),
    read: Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 200)),
    summary: text,
    image: article.urlToImage || '',
    url: article.url,
    source: article.source?.name || 'News source',
    publishedAt,
  }
}

function NewsCard({ article }) {
  return (
    <StoryLink article={article} className="home-news-card">
      <div className="home-news-thumb">
        {article.image && <img src={article.image} alt="" loading="lazy" />}
        <span className={`cat c-${article.category.toLowerCase()}`}>{article.category}</span>
      </div>
      <div className="home-news-copy">
        <h3>{article.title}</h3>
        <span className="meta">{article.date} <i>·</i> {article.source}</span>
      </div>
    </StoryLink>
  )
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dateRange = normalizeNewsDateRange(searchParams.get('range'))
  const [allArticles, setAllArticles] = useState([])
  const [index, setIndex] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadNews = async () => {
      try {
        const response = await fetch('/api/news')
        const data = await response.json()
        if (!response.ok || data.status !== 'ok') throw new Error(data.message || 'Category headlines are temporarily unavailable.')

        const currentArticles = (data.articles || [])
          .filter((article) => ALLOWED_CATEGORIES.has(article.category) && article.title && article.title !== '[Removed]' && article.title.toLowerCase() !== 'google news' && article.url && !article.url.includes('access.workspace.google.com/remediate') && article.publishedAt && Number.isFinite(new Date(article.publishedAt).getTime()))
          .sort((first, second) => new Date(second.publishedAt) - new Date(first.publishedAt))
          .map(mapArticle)
        if (active) {
          setAllArticles(currentArticles)
          setError('')
          setStatus('ready')
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || 'Could not load category headlines.')
          setStatus('error')
        }
      }
    }

    loadNews()
    const refreshTimer = window.setInterval(loadNews, 30 * 60 * 1000)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [])

  const articles = filterArticlesByDateRange(allArticles, dateRange)
  const updateDateRange = (range) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('range', range)
    setSearchParams(nextParams)
  }

  useEffect(() => {
    setIndex(0)
  }, [dateRange])

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(clock)
  }, [])

  const slides = articles.slice(0, 4)
  useEffect(() => {
    if (slides.length < 2) return undefined
    const timer = setInterval(() => setIndex((current) => (current + 1) % slides.length), 6000)
    return () => clearInterval(timer)
  }, [slides.length])

  const slide = slides[index]
  const liveTime = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  }).format(now)
  const latest = articles.slice(0, 6)
  const moreNews = articles.slice(6, 12)
  const interestSections = QUICK.map(({ label, to }) => ({
    label,
    to,
    articles: articles.filter((article) => article.category === label).slice(0, 3),
  })).filter((section) => section.articles.length > 0)

  return (
    <>
      <div className="card home-date-filter">
        <NewsDateFilter value={dateRange} onChange={updateDateRange} />
      </div>
      <div className="home-top">
        <div>
          <section
            className="hero"
            style={{ backgroundImage: slide?.image
              ? `linear-gradient(transparent 35%, rgba(5,10,25,.92)), url("${slide.image}")`
              : 'linear-gradient(145deg, #101c35, #1b2d50)' }}
          >
            {slide && slides.length > 1 && <>
              <button className="arrow left" onClick={() => setIndex((index + slides.length - 1) % slides.length)} aria-label="Previous slide"><ChevronLeft size={18} /></button>
              <button className="arrow right" onClick={() => setIndex((index + 1) % slides.length)} aria-label="Next slide"><ChevronRight size={18} /></button>
            </>}
            <div className="hero-body">
              {slide ? <>
                <span className="tag-red">{slide.category} · {slide.source}</span>
                <h1>{slide.title}</h1>
                {slide.summary && <p>{slide.summary}</p>}
                <div className="hero-foot">
                  <span><Clock size={14} /> Live · {liveTime} IST &nbsp; <User size={14} /> {slide.read} min read</span>
                  <StoryLink article={slide} className="btn-outline">Read More <ArrowRight size={16} /></StoryLink>
                </div>
                {slides.length > 1 && <div className="dots">
                  {slides.map((article, dot) => <button key={article.id} className={dot === index ? 'on' : ''} onClick={() => setIndex(dot)} aria-label={`Slide ${dot + 1}`} />)}
                </div>}
              </> : <div className="news-status" role="status">
                {status === 'loading' ? 'Loading headlines...' : status === 'error' ? error : 'No recent stories in the selected categories.'}
              </div>}
            </div>
          </section>

          <div className="quick card">
            {QUICK.map(({ label, Icon, color, to }) => (
              <Link key={label} to={`${to}?range=${dateRange}`}><Icon size={26} color={color} /><span>{label}</span></Link>
            ))}
          </div>
        </div>

        <aside className="card top-stories">
          <h2 className="accent">Top Stories</h2>
          {articles.slice(1, 6).map((article) => <Row key={article.id} a={article} />)}
          {status === 'loading' && <p className="muted news-list-status">Loading headlines...</p>}
          {status === 'error' && <p className="muted news-list-status">{error}</p>}
          {status === 'ready' && articles.length <= 1 && <p className="muted news-list-status">No recent stories in the selected categories.</p>}
        </aside>
      </div>

      <div className="home-news-sections">
        <section className="card home-feed-section">
          <SectionTitle>Latest News</SectionTitle>
          <div className="home-news-grid">
            {latest.map((article) => <NewsCard key={article.id} article={article} />)}
          </div>
          {status === 'loading' && <p className="muted news-list-status">Loading headlines...</p>}
          {status === 'error' && <p className="muted news-list-status">{error}</p>}
          {status === 'ready' && latest.length === 0 && <p className="muted news-list-status">No recent stories in the selected categories.</p>}
        </section>
        {moreNews.length > 0 && <section className="card home-feed-section">
          <SectionTitle>More News</SectionTitle>
          <div className="home-news-grid">
            {moreNews.map((article) => <NewsCard key={article.id} article={article} />)}
          </div>
        </section>}
        <section className="promo">
          <h3>Stories Across Your Interests</h3>
          <p>Business, technology, sports, entertainment, education and lifestyle headlines.</p>
          <Link to={`/category/business?range=${dateRange}`} className="btn-red">Explore News <ArrowRight size={16} /></Link>
        </section>
      </div>

      {interestSections.length > 0 && (
        <section className="home-interests">
          <div className="home-interests-heading">
            <div>
              <span className="home-kicker">MORE TO EXPLORE</span>
              <h2 className="accent">News Across Your Interests</h2>
            </div>
            <p className="muted">Fresh headlines, grouped by the topics you follow.</p>
          </div>
          <div className="interest-grid">
            {interestSections.map(({ label, to, articles: categoryArticles }) => (
              <section className="card interest-card" key={label}>
                <SectionTitle to={`${to}?range=${dateRange}`}>{label}</SectionTitle>
                <div className="interest-stories">
                  {categoryArticles.map((article) => <Row key={article.id} a={article} />)}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
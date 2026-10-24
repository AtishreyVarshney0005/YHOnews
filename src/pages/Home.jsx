import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Home as HomeIcon, Info, Phone, MapPin, Film, Vote, Globe, Landmark, BarChart3, Settings, Trophy, Drama, GraduationCap, Heart, ChevronLeft, ChevronRight, Clock, ArrowRight, ArrowUpRight, TrendingUp, CalendarDays, BookOpen, Radio } from 'lucide-react'
import { SectionTitle, Row, StoryLink } from '../components/Bits.jsx'
import NewsDateFilter from '../components/NewsDateFilter.jsx'
import PageMeta from '../components/PageMeta.jsx'
import { PUBLISHABLE_CATEGORIES, filterArticlesByDateRange, mapPublishedArticle, normalizeNewsDateRange, slugify } from '../data.js'

const CATEGORY_ICONS = {
  India: Globe,
  World: Globe,
  Cities: MapPin,
  Movies: Film,
  Election: Vote,
  Politics: Landmark,
  Business: BarChart3,
  Technology: Settings,
  Sports: Trophy,
  Entertainment: Drama,
  Education: GraduationCap,
  Lifestyle: Heart,
}
const QUICK = [
  { label: 'Home', Icon: HomeIcon, color: '#101c35', to: '/', home: true },
  ...PUBLISHABLE_CATEGORIES
    .slice()
    .sort((first, second) => first.localeCompare(second))
    .map((label) => ({
      label,
      Icon: CATEGORY_ICONS[label] || Globe,
      color: '#245bd5',
      to: `/category/${slugify(label)}`,
      category: true,
    })),
  { label: 'About Us', Icon: Info, color: '#64748b', to: '/about' },
  { label: 'Contact Us', Icon: Phone, color: '#df2434', to: '/contact' },
]

function NewsCard({ article }) {
  return (
    <StoryLink article={article} className="home-news-card">
      <div className="home-news-thumb">
        {article.image && <img src={article.image} alt="" loading="lazy" decoding="async" />}
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
  const [topStoriesMode, setTopStoriesMode] = useState('latest')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadNews = async () => {
      try {
        const response = await fetch('/api/articles')
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Published articles are temporarily unavailable.')
        const publishedArticles = (data.articles || []).map(mapPublishedArticle)
        if (active) {
          setAllArticles(publishedArticles)
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
  const popularArticles = [...allArticles]
    .sort((first, second) => (Number(second.viewCount) || 0) - (Number(first.viewCount) || 0))
    .slice(0, 5)
  const updateDateRange = (range) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('range', range)
    setSearchParams(nextParams)
  }

  useEffect(() => {
    setIndex(0)
  }, [dateRange])

  const slides = articles.slice(0, 4)
  useEffect(() => {
    if (slides.length < 2) return undefined
    const timer = setInterval(() => setIndex((current) => (current + 1) % slides.length), 6000)
    return () => clearInterval(timer)
  }, [slides.length])

  const slide = slides[index]
  const latest = articles.slice(0, 6)
  const moreNews = articles.slice(6, 12)
  const topStories = topStoriesMode === 'trending'
    ? [...articles].sort((first, second) => (Number(second.viewCount) || 0) - (Number(first.viewCount) || 0)).slice(0, 5)
    : articles.slice(1, 6)
  const interestSections = QUICK.map(({ label, to }) => ({
    label,
    to,
    articles: articles.filter((article) => article.category === label).slice(0, 3),
  })).filter((section) => section.articles.length > 0)

  return (
    <>
      <PageMeta
        title="Latest News Today: India, World, Business & More | YHO News"
        description="Read today's latest news, top headlines and updates from India and around the world across business, technology, sports, entertainment and more."
        path="/"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'NewsMediaOrganization',
          name: 'YHO News',
          url: window.location.origin,
          logo: `${window.location.origin}/logo.png`,
        }}
      />
      <div className="card home-date-filter">
        <NewsDateFilter value={dateRange} onChange={updateDateRange} />
      </div>
      {articles.length > 0 && (
        <nav className="headline-strip" aria-label="Top headlines">
          <div className="headline-strip-label">
            <TrendingUp size={18} aria-hidden="true" />
            <span>Top Headlines</span>
          </div>
          <div className="headline-strip-list">
            {popularArticles.map((article, headlineIndex) => (
              <StoryLink key={article.id} article={article} className="headline-strip-item">
                <span className="headline-strip-number">{String(headlineIndex + 1).padStart(2, '0')}</span>
                <span className="headline-strip-copy">
                  <small>{article.category} · {Number(article.viewCount) || 0} views</small>
                  <b>{article.title}</b>
                </span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </StoryLink>
            ))}
          </div>
        </nav>
      )}
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
                <div className="hero-kicker">
                  <span className="hero-lead-label">Lead story</span>
                  <span className="tag-red">{slide.category}</span>
                  <span className="hero-source">{slide.source}</span>
                </div>
                <h1>{slide.title}</h1>
                {slide.summary && <p>{slide.summary}</p>}
                <div className="hero-foot">
                  <span className="hero-meta">
                    <span><CalendarDays size={14} /> {slide.date}</span>
                    <i aria-hidden="true" />
                    <span><BookOpen size={14} /> {slide.read} min read</span>
                  </span>
                  <StoryLink article={slide} className="btn-outline">Read full story <ArrowRight size={16} /></StoryLink>
                </div>
                {slides.length > 1 && <div className="dots">
                  {slides.map((article, dot) => <button key={article.id} className={dot === index ? 'on' : ''} onClick={() => setIndex(dot)} aria-label={`Slide ${dot + 1}`} />)}
                </div>}
              </> : status === 'loading'
                ? <div className="hero-skeleton" aria-hidden="true"><span /><span /><span /></div>
                : <div className="news-status" role={status === 'error' ? 'alert' : 'status'}>
                  {status === 'error' ? error : 'No recent stories in the selected categories.'}
                </div>}
            </div>
          </section>

          <nav className="quick card" aria-label="Site navigation">
            {QUICK.map(({ label, Icon, color, to, home, category }) => (
              <Link key={label} to={`${to}${home || category ? `?range=${dateRange}` : ''}`}><Icon size={26} color={color} /><span>{label}</span></Link>
            ))}
          </nav>
          <section className="yho-spotlight" aria-label="About YHO News">
            <div className="yho-spotlight-mark" aria-hidden="true">
              <span className="yho-signal yho-signal-one" />
              <span className="yho-signal yho-signal-two" />
              <span className="yho-signal yho-signal-three" />
              <Radio size={23} />
            </div>
            <div className="yho-spotlight-copy">
              <span className="yho-spotlight-kicker">YOUR WORLD, YOUR NEWS</span>
              <h2>Stay curious. Stay informed.</h2>
              <p>Explore the stories shaping your world, all in one place.</p>
            </div>
            <Link to="/about" className="yho-spotlight-link">Discover YHO <ArrowRight size={16} /></Link>
          </section>
        </div>

        <aside className="card top-stories">
          <div className="top-stories-heading">
            <h2 className="accent">Top Stories</h2>
            <div className="top-stories-tabs" aria-label="Choose top stories">
              <button type="button" className={topStoriesMode === 'latest' ? 'on' : ''} aria-pressed={topStoriesMode === 'latest'} onClick={() => setTopStoriesMode('latest')}>Latest</button>
              <button type="button" className={topStoriesMode === 'trending' ? 'on' : ''} aria-pressed={topStoriesMode === 'trending'} onClick={() => setTopStoriesMode('trending')}>Trending</button>
            </div>
          </div>
          {topStories.map((article) => <Row key={article.id} a={article} />)}
          {status === 'loading' && <div className="news-list-skeleton" aria-hidden="true"><span /><span /><span /></div>}
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
          {status === 'loading' && <div className="news-cards-skeleton" aria-hidden="true"><span /><span /><span /></div>}
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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Home, Calendar, Clock, Tag, TrendingUp } from 'lucide-react'
import { mapPublishedArticle } from '../data.js'
import Socials from '../components/Socials.jsx'
import { Row } from '../components/Bits.jsx'
import PageMeta from '../components/PageMeta.jsx'
import { siteUrl } from '../site.js'

export default function Article() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const rangeQuery = searchParams.get('range') ? `?range=${encodeURIComponent(searchParams.get('range'))}` : ''
  const searchRangeQuery = searchParams.get('range') ? `&range=${encodeURIComponent(searchParams.get('range'))}` : ''
  const [publishedArticle, setPublishedArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [latestArticles, setLatestArticles] = useState([])
  const [latestStatus, setLatestStatus] = useState('loading')
  const [latestError, setLatestError] = useState('')
  const [articleHeight, setArticleHeight] = useState(0)
  const [visibleLatestCount, setVisibleLatestCount] = useState(0)
  const [latestFitComplete, setLatestFitComplete] = useState(false)
  const articleElement = useRef(null)
  const latestElement = useRef(null)
  const latestMeasureElement = useRef(null)
  const lastMeasuredArticleHeight = useRef(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setPublishedArticle(null)
    setArticleHeight(0)
    setVisibleLatestCount(0)
    setLatestFitComplete(false)
    lastMeasuredArticleHeight.current = 0
    fetch(`/api/articles/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Article not found.')
        if (active) setPublishedArticle(mapPublishedArticle(data.article))
      })
      .catch(() => { if (active) setPublishedArticle(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const a = publishedArticle
  useEffect(() => {
    if (!a || !articleElement.current) return undefined

    const observer = new ResizeObserver(([entry]) => {
      const nextHeight = entry.target.getBoundingClientRect().height
      if (Math.abs(lastMeasuredArticleHeight.current - nextHeight) < 0.25) return
      lastMeasuredArticleHeight.current = nextHeight
      setArticleHeight(nextHeight)
      setVisibleLatestCount(0)
      setLatestFitComplete(false)
    })
    observer.observe(articleElement.current)
    const resetLatestLayout = () => {
      setVisibleLatestCount(0)
      setLatestFitComplete(false)
    }
    window.addEventListener('resize', resetLatestLayout)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resetLatestLayout)
    }
  }, [a])

  useEffect(() => {
    let active = true
    setLatestStatus('loading')
    setLatestArticles([])
    setVisibleLatestCount(0)
    setLatestFitComplete(false)
    fetch('/api/articles')
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Latest news is temporarily unavailable.')
        const articles = (data.articles || [])
          .map(mapPublishedArticle)
          .filter((article) => article.id !== id)
          .sort((first, second) => new Date(second.publishedAt || second.createdAt || 0).getTime() - new Date(first.publishedAt || first.createdAt || 0).getTime())
        if (active) {
          setLatestArticles(articles)
          setLatestError('')
          setLatestStatus('ready')
        }
      })
      .catch((error) => {
        if (!active) return
        setLatestError(error.message || 'Latest news is temporarily unavailable.')
        setLatestStatus('error')
      })
    return () => { active = false }
  }, [id])

  useLayoutEffect(() => {
    if (!a || !articleHeight || latestStatus !== 'ready' || !latestElement.current || !latestMeasureElement.current || latestFitComplete) return

    const panel = latestElement.current
    const heading = panel.querySelector('.article-latest-heading')
    if (!heading) return

    const panelStyle = window.getComputedStyle(panel)
    const headingEnd = heading.getBoundingClientRect().bottom - panel.getBoundingClientRect().top
    const availableHeight = articleHeight
      - headingEnd
      - Number.parseFloat(panelStyle.paddingBottom)
      - Number.parseFloat(panelStyle.borderBottomWidth)
    let usedHeight = 0
    let fittingCount = 0
    for (const row of latestMeasureElement.current.querySelectorAll('.row')) {
      const rowHeight = row.getBoundingClientRect().height
      if (usedHeight + rowHeight > availableHeight + 0.5) break
      usedHeight += rowHeight
      fittingCount += 1
    }

    setVisibleLatestCount(fittingCount)
    setLatestFitComplete(true)
  }, [a, articleHeight, latestArticles, latestStatus, latestFitComplete])

  const structuredData = useMemo(() => a ? ({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: a.title,
    description: a.summary,
    image: a.image ? [siteUrl(a.image)] : undefined,
    datePublished: a.publishedAt || a.createdAt,
    dateModified: a.updatedAt || a.publishedAt || a.createdAt,
    author: { '@type': 'Organization', name: a.author || 'YHO News' },
    publisher: { '@type': 'Organization', name: 'YHO News', logo: { '@type': 'ImageObject', url: siteUrl('/logo.png') } },
    mainEntityOfPage: siteUrl(`/article/${encodeURIComponent(a.id)}`),
  }) : null, [a])

  if (!a && loading) return (
    <div className="article-skeleton card" aria-hidden="true">
      <span className="article-skeleton-image" />
      <span className="article-skeleton-title" />
      <span className="article-skeleton-line" />
      <span className="article-skeleton-line short" />
      <span className="article-skeleton-line" />
    </div>
  )
  if (!a) return <p className="empty card">Article not found. <Link to={`/${rangeQuery}`}>Back to homepage</Link></p>

  const tags = a.tags || [a.tag, a.category]
  return (
    <>
      <PageMeta
        title={`${a.title} | YHO News`}
        description={a.summary || a.title}
        path={`/article/${encodeURIComponent(a.id)}`}
        image={a.image}
        type="article"
        structuredData={structuredData}
      />
      <div className="article-layout">
      <article ref={articleElement}>
        <nav className="crumbs">
          <Link to={`/${rangeQuery}`}><Home size={14} /> Homepage</Link> <span>&gt;</span>
          <Link to={`/category/${a.category.toLowerCase()}${rangeQuery}`}>{a.category}</Link> <span>&gt;</span>
          <em>{a.title}</em>
        </nav>
        <div className="art-hero">
          <img src={a.image.replace('/600/400', '/1100/400')} alt="" width="1100" height="400" loading="eager" fetchPriority="high" decoding="async" />
          <span className="tag-red">{a.category}</span>
        </div>
        <div className="art-head">
          <div>
            <h1>{a.title}</h1>
            <div className="meta"><Calendar size={14} /> {a.date} &nbsp;|&nbsp; <Clock size={14} /> {a.read} min read</div>
          </div>
          <div className="share-inline"><b>Share</b><Socials whatsappShareUrl={window.location.href} copyLinkUrl={window.location.href} /></div>
        </div>
        <div className="art-body">
          <div dangerouslySetInnerHTML={{ __html: a.contentHtml }} />
        </div>
        <div className="tags">
          <b><Tag size={16} /> Tags</b>
          {tags.map((t) => <Link key={t} to={`/search?q=${encodeURIComponent(t)}${searchRangeQuery}`}>{t}</Link>)}
        </div>
      </article>

      <aside>
        <section
          className="card article-latest"
          ref={latestElement}
          style={latestFitComplete && articleHeight ? { height: `${articleHeight}px` } : undefined}
        >
          <h2 className="accent article-latest-heading"><TrendingUp size={18} /> Latest News</h2>
          {latestArticles.slice(0, visibleLatestCount).map((article) => <Row key={article.id} a={article} />)}
          {latestStatus === 'loading' && <div className="news-list-skeleton" aria-hidden="true"><span /><span /><span /></div>}
          {latestStatus === 'error' && <p className="muted news-list-status">{latestError}</p>}
          {latestStatus === 'ready' && latestArticles.length === 0 && <p className="muted news-list-status">No other stories are available right now.</p>}
          {latestStatus === 'ready' && (
            <div className="article-latest-measure" ref={latestMeasureElement} aria-hidden="true">
              {latestArticles.map((article) => <Row key={article.id} a={article} />)}
            </div>
          )}
        </section>
        <div className="card share-box">
          <h3>Share This Article</h3>
          <Socials whatsappShareUrl={window.location.href} copyLinkUrl={window.location.href} />
        </div>
      </aside>
      </div>
    </>
  )
}

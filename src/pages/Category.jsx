import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CATEGORIES, filterArticlesByDateRange, mapPublishedArticle, normalizeNewsDateRange } from '../data.js'
import { ReadMeta } from '../components/Bits.jsx'
import NewsDateFilter from '../components/NewsDateFilter.jsx'
import NotFound from './NotFound.jsx'

const CUSTOM_CATEGORIES = new Set(['business', 'technology', 'sports', 'entertainment', 'education', 'lifestyle'])

export default function Category() {
  const { slug } = useParams()
  const name = CATEGORIES.find((c) => c.toLowerCase() === slug)
  const [searchParams, setSearchParams] = useSearchParams()
  const dateRange = normalizeNewsDateRange(searchParams.get('range'))
  const [publishedArticles, setPublishedArticles] = useState([])
  const [tag, setTag] = useState('All')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let active = true
    fetch('/api/articles')
      .then((response) => response.ok ? response.json() : { articles: [] })
      .then((data) => { if (active) setPublishedArticles(data.articles || []) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    setTag('All')
    setPage(1)
  }, [slug])

  if (!name) return <NotFound />

  const inCat = publishedArticles.map(mapPublishedArticle).filter((a) => a.category.toLowerCase() === slug)
  const dateFilteredArticles = filterArticlesByDateRange(inCat, dateRange)
  const tags = ['All', ...new Set(dateFilteredArticles.map((a) => a.tag))]
  const list = tag === 'All' ? dateFilteredArticles : dateFilteredArticles.filter((a) => a.tag === tag)
  const pageSize = CUSTOM_CATEGORIES.has(slug) ? 20 : 6
  const pageCount = Math.ceil(list.length / pageSize)
  const visible = list.slice((page - 1) * pageSize, page * pageSize)
  const updateDateRange = (range) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('range', range)
    setSearchParams(nextParams)
    setPage(1)
    setTag('All')
  }

  return (
    <section className="card catpage">
      <h1 className="accent">{name}</h1>
      <p className="muted">Latest news, trends, and updates from the world of {name.toLowerCase()}.</p>
      <NewsDateFilter value={dateRange} onChange={updateDateRange} />
      {!CUSTOM_CATEGORIES.has(slug) && (
        <div className="chips">
          {tags.map((t) => (
            <button key={t} className={t === tag ? 'on' : ''} aria-pressed={t === tag} onClick={() => { setTag(t); setPage(1) }}>{t}</button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <p className="empty">No articles in this category yet. Check back soon.</p>
      ) : (
        <div className="catgrid">
          {visible.map((a, k) => (
            <Link key={a.id} to={`/article/${a.id}?range=${dateRange}`} className={`tile ${k === 0 ? 'feature' : ''}`}>
              <div className="thumb">
                <img src={a.image} alt="" loading="lazy" />
                <span className="tag-blue">{a.tag}</span>
              </div>
              <h3>{a.title}</h3>
              <ReadMeta a={a} />
            </Link>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav className="pager" aria-label="Category pages">
          <button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page">‹</button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button key={n} className={n === page ? 'on' : ''} aria-current={n === page ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>
          ))}
          <button disabled={page === pageCount} onClick={() => setPage(page + 1)} aria-label="Next page">›</button>
        </nav>
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Calendar, Clock } from 'lucide-react'
import { PUBLISHABLE_CATEGORIES, filterArticlesByDateRange, slugify, mapPublishedArticle, normalizeNewsDateRange } from '../data.js'
import NewsDateFilter from '../components/NewsDateFilter.jsx'
import PageMeta from '../components/PageMeta.jsx'

const FILTERS = PUBLISHABLE_CATEGORIES

export default function Search() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') || '').trim()
  const dateRange = normalizeNewsDateRange(params.get('range'))
  const [selected, setSelected] = useState([]) 
  const [publishedArticles, setPublishedArticles] = useState([])

  useEffect(() => {
    let active = true
    fetch('/api/articles')
      .then((response) => response.ok ? response.json() : { articles: [] })
      .then((data) => { if (active) setPublishedArticles(data.articles || []) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const toggle = (c) => setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))

  const matchingArticles = publishedArticles.map(mapPublishedArticle).filter((a) => {
    const hay = `${a.title} ${a.summary} ${a.tag} ${a.category}`.toLowerCase()
    return q && hay.includes(q.toLowerCase()) && (selected.length === 0 || selected.includes(a.category))
  })
  const results = filterArticlesByDateRange(matchingArticles, dateRange)
  const updateDateRange = (range) => {
    const nextParams = new URLSearchParams(params)
    nextParams.set('range', range)
    setParams(nextParams)
  }

  return (
    <>
      <PageMeta
        title={q ? `Search: ${q} | YHO News` : 'Search News | YHO News'}
        description={q ? `Search YHO News for stories and updates about ${q}.` : 'Search the latest news and updates from YHO News.'}
        path="/search"
        robots="noindex, follow"
      />
      <div className="search-layout">
        <section className="card">
          <h1 className="accent">{q ? `Search Results for "${q}"` : 'Search News'}</h1>
          <p className="muted">{q ? <>We found <b>{results.length.toLocaleString()}</b> results for “{q}”</> : 'Enter a keyword in the search bar to find articles.'}</p>
          <NewsDateFilter value={dateRange} onChange={updateDateRange} />
          {q && results.length === 0 && <p className="empty">No results. Try a different keyword or clear a category filter.</p>}
          {results.map((a) => (
            <Link key={a.id} to={`/article/${a.id}?range=${dateRange}`} className="result">
              <img src={a.image} alt="" loading="lazy" decoding="async" />
              <div>
                <small className={`cat c-${slugify(a.category)}`}>{a.category}</small>
                <h3>{a.title}</h3>
                <span className="meta"><Calendar size={12} /> {a.date} <i>|</i> <Clock size={12} /> {a.read} min read</span>
                <p>{a.summary}</p>
              </div>
            </Link>
          ))}
        </section>

        <aside className="card filter">
          <h2 className="accent">Filter by Category</h2>
          <label className={`check all ${selected.length === 0 ? 'on' : ''}`}>
            <input type="checkbox" checked={selected.length === 0} onChange={() => setSelected([])} />
            <span className="box" /> All Categories
          </label>
          {FILTERS.map((c) => (
            <label key={c} className="check">
              <input type="checkbox" checked={selected.includes(c)} onChange={() => toggle(c)} />
              <span className="box" /> {c}
            </label>
          ))}
        </aside>
      </div>
    </>
  )
}

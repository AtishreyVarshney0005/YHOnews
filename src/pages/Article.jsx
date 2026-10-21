import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Home, Calendar, Clock, Tag } from 'lucide-react'
import { mapPublishedArticle } from '../data.js'
import Socials from '../components/Socials.jsx'

export default function Article() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const rangeQuery = searchParams.get('range') ? `?range=${encodeURIComponent(searchParams.get('range'))}` : ''
  const searchRangeQuery = searchParams.get('range') ? `&range=${encodeURIComponent(searchParams.get('range'))}` : ''
  const [publishedArticle, setPublishedArticle] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
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

  if (!a && loading) return <p className="empty card">Loading article...</p>
  if (!a) return <p className="empty card">Article not found. <Link to={`/${rangeQuery}`}>Back to homepage</Link></p>

  const tags = a.tags || [a.tag, a.category]

  return (
    <div className="article-layout">
      <article>
        <nav className="crumbs">
          <Link to={`/${rangeQuery}`}><Home size={14} /> Homepage</Link> <span>&gt;</span>
          <Link to={`/category/${a.category.toLowerCase()}${rangeQuery}`}>{a.category}</Link> <span>&gt;</span>
          <em>{a.title}</em>
        </nav>
        <div className="art-hero">
          <img src={a.image.replace('/600/400', '/1100/400')} alt="" />
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
        <div className="card share-box">
          <h3>Share This Article</h3>
          <Socials whatsappShareUrl={window.location.href} copyLinkUrl={window.location.href} />
        </div>
      </aside>
    </div>
  )
}

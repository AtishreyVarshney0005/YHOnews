import { Link } from 'react-router-dom'
import { Clock, BookOpen } from 'lucide-react'

export const SectionTitle = ({ children, to }) => (
  <div className="sec-title">
    <h2 className="accent">{children}</h2>
    {to && <Link to={to} className="viewall">View all →</Link>}
  </div>
)

export const Meta = ({ a, ago = false }) => (
  <span className="meta">
    <Clock size={12} /> {ago ? a.ago : a.date}
    {ago && <> <i>|</i> {a.date}</>}
  </span>
)

export const ReadMeta = ({ a }) => (
  <span className="meta"><Clock size={12} /> {a.date} <i>•</i> <BookOpen size={12} /> {a.read} min read</span>
)

export function StoryLink({ article, children, ...props }) {
  if (article.url) {
    return <a {...props} href={article.url} target="_blank" rel="noopener noreferrer">{children}</a>
  }
  return <Link {...props} to={`/article/${article.id}`}>{children}</Link>
}

// Row: thumbnail + category + title + meta
export function Row({ a }) {
  return (
    <StoryLink article={a} className="row">
      {a.image && <img src={a.image} alt="" loading="lazy" />}
      <div>
        <small className={`cat c-${a.category.toLowerCase()}`}>{a.category}</small>
        <h3>{a.title}</h3>
        <Meta a={a} ago /> <small>{a.source}</small>
      </div>
    </StoryLink>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'

const readJsonResponse = async (response, fallbackMessage) => {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(fallbackMessage)
  }
}

const normalizeArticleCategory = (article) => String(article?.category || 'Uncategorized').trim() || 'Uncategorized'
const normalizeArticleStatus = (article) => String(article?.status || 'Draft').trim() || 'Draft'

export default function Articles() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/admin/articles')
      .then(async (response) => {
        const data = await readJsonResponse(response, 'Could not load articles.')
        if (!response.ok) throw new Error(data.message || 'Could not load articles.')
        if (active) setRows(Array.isArray(data.articles) ? data.articles : [])
      })
      .catch((loadError) => { if (active) setError(loadError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const remove = async (id) => {
    if (!window.confirm('Delete this article? This cannot be undone.')) return
    const response = await fetch(`/api/admin/articles/${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = await readJsonResponse(response, 'Could not delete article.')
    if (!response.ok) return setError(data.message || 'Could not delete article.')
    setRows((current) => current.filter((article) => String(article.id) !== String(id)))
  }

  const filtered = rows.filter((article) => {
    const category = normalizeArticleCategory(article)
    const status = normalizeArticleStatus(article)
    const text = `${article?.title || ''} ${category} ${status}`.toLowerCase()
    return text.includes(query.trim().toLowerCase())
  })

  return (
    <section className="card articles-section">
      <div className="card-head">
        <h2>All Articles</h2>
        <div className="toolbar-actions">
          <div className="search-box">
            <Search size={14} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search articles"
              aria-label="Search articles"
            />
          </div>
          <Link to="/admin/add" className="btn-red add-news"><Plus size={16} /> Add News</Link>
        </div>
      </div>

      <div className="table-wrap">
        {error && <p className="err" role="alert">{error}</p>}
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Thumbnail</th>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="empty-state">Loading articles...</td></tr>
            ) : filtered.length ? (
              filtered.map((article, index) => (
                <tr key={String(article.id ?? `${article.title}-${index}`)}>
                  <td>{index + 1}</td>
                  <td><img src={article.image || ''} alt="" /></td>
                  <td className="t">{article.title || 'Untitled article'}</td>
                  <td><span className={`pill p-${normalizeArticleCategory(article).toLowerCase()}`}>{normalizeArticleCategory(article)}</span></td>
                  <td><span className={`pill ${normalizeArticleStatus(article) === 'Published' ? 'p-pub' : 'p-draft'}`}>{normalizeArticleStatus(article)}</span></td>
                  <td className="d">{article.date || '—'}</td>
                  <td>
                    <div className="actions">
                      <Link to={`/admin/articles/${article.id}/edit`} className="btn-blue"><Pencil size={13} /> Edit</Link>
                      <button type="button" className="btn-red sm" onClick={() => remove(article.id)}><Trash2 size={13} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty-state">No matching articles found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, CheckCircle2, FilePenLine, Tags, Plus, Pencil, Trash2 } from 'lucide-react'
import { getAdminArticles, readApiResponse, removeAdminArticleFromCache } from './api.js'

export default function Dashboard() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getAdminArticles()
      .then((articles) => { if (active) setRows(articles) })
      .catch((loadError) => { if (active) setError(loadError.message) })
    return () => { active = false }
  }, [])

  const remove = async (id) => {
    if (!window.confirm('Delete this article? This cannot be undone.')) return
    const response = await fetch(`/api/admin/articles/${encodeURIComponent(id)}`, { method: 'DELETE' })
    try {
      await readApiResponse(response, 'Could not delete article.')
    } catch (deleteError) {
      setError(deleteError.message)
      return
    }
    removeAdminArticleFromCache(id)
    setRows((current) => current.filter((article) => article.id !== id))
  }

  const published = rows.filter((article) => article.status === 'Published').length
  const drafts = rows.filter((article) => article.status === 'Draft').length

  const stats = [
    { label: 'Total Articles', value: rows.length, detail: 'Saved on this site', Icon: FileText, tone: 'blue' },
    { label: 'Published', value: published, detail: 'Visible to readers', Icon: CheckCircle2, tone: 'green' },
    { label: 'Drafts', value: drafts, detail: 'Only visible to admins', Icon: FilePenLine, tone: 'orange' },
    { label: 'Categories', value: new Set(rows.map((article) => article.category)).size, detail: 'In use', Icon: Tags, tone: 'purple' },
  ]

  return (
    <>
      <div className="dashboard-heading">
        <div>
          <h2>Dashboard Overview</h2>
          <p className="muted">Track your news performance and manage articles.</p>
        </div>
        <Link to="/admin/add" className="btn-red add-news"><Plus size={16} /> Add News</Link>
      </div>

      <div className="stats">
        {stats.map(({ label, value, detail, Icon, tone }) => (
          <div key={label} className={`stat ${tone}`}>
            <span className="stat-icon"><Icon size={22} /></span>
            <div>
              <small>{label}</small>
              <b>{value}</b>
              <em>{detail}</em>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="err" role="alert">{error}</p>}
      <section className="card">
        <div className="card-head">
          <h2><FileText size={18} /> Recent Articles</h2>
          <Link to="/admin/articles" className="link">View All →</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Thumbnail</th><th>Title</th><th>Category</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td><img src={r.image} alt="" /></td>
                  <td className="t">{r.title}</td>
                  <td><span className={`pill p-${r.category.toLowerCase()}`}>{r.category}</span></td>
                  <td><span className={`pill ${r.status === 'Published' ? 'p-pub' : 'p-draft'}`}>{r.status}</span></td>
                  <td className="d">{r.date}</td>
                  <td>
                    <div className="actions">
                      <Link to={`/admin/articles/${r.id}/edit`} className="btn-blue"><Pencil size={13} /> Edit</Link>
                      <button className="btn-red sm" onClick={() => remove(r.id)}><Trash2 size={13} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="7" className="empty-state">No articles have been added yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

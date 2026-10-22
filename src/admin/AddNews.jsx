import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Image as ImageIcon, Save, ChevronDown, Bold, Italic, Underline, Strikethrough, Link2, Quote,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo2, Redo2,
} from 'lucide-react'
import { CATEGORIES, sanitizeArticleContent } from '../data.js'
import { readApiResponse } from './api.js'

const AUTHORS = ['Admin', 'Editorial Desk', 'Staff Reporter']
const MAX_BYTES = 2 * 1024 * 1024
const MAX_META_DESCRIPTION_LENGTH = 150
const ADD_NEWS_CATEGORIES = CATEGORIES.filter((category) => !['India', 'World', 'Politics', 'Health'].includes(category))

function getContentStats(text) {
  const content = text.trim()
  return {
    words: content ? content.split(/\s+/).length : 0,
    sentences: content ? content.split(/[.!?]+/).filter((sentence) => sentence.trim()).length : 0,
  }
}

export default function AddNews() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [existingArticle, setExistingArticle] = useState(null)
  const [loadingExisting, setLoadingExisting] = useState(Boolean(id))
  const editor = useRef(null)
  const fileInput = useRef(null)
  const [form, setForm] = useState(() => ({
    title: existingArticle?.title || '',
    category: existingArticle?.category || '',
    metaTitle: existingArticle?.meta?.title || existingArticle?.title || '',
    metaDescription: existingArticle?.meta?.description || existingArticle?.summary || '',
    author: existingArticle?.author || '',
    status: existingArticle?.status === 'Draft' ? 'Draft' : 'Publish',
  }))
  const [image, setImage] = useState(existingArticle?.image || '')
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [contentStats, setContentStats] = useState({ words: 0, sentences: 0 })

  useEffect(() => {
    if (!id) return undefined
    let active = true
    fetch('/api/admin/articles')
      .then(async (response) => {
        const data = await readApiResponse(response, 'Could not load article.')
        const article = data.articles.find((item) => String(item.id) === id)
        if (active && article) {
          setExistingArticle(article)
          setForm({
            title: article.title || '', category: article.category || '',
            metaTitle: article.meta?.title || article.title || '',
            metaDescription: article.meta?.description || article.summary || '',
            author: article.author || '', status: article.status === 'Draft' ? 'Draft' : 'Publish',
          })
          setImage(article.image || '')
        }
      })
      .catch((error) => { if (active) setSaveError(error.message) })
      .finally(() => { if (active) setLoadingExisting(false) })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (editor.current && existingArticle) {
      const content = existingArticle.content || existingArticle.summary || ''
      editor.current.innerHTML = sanitizeArticleContent(content)
      setContentStats(getContentStats(editor.current.innerText))
    }
  }, [existingArticle])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const readFile = (file) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setErrors((e) => ({ ...e, image: 'Use a JPG, PNG or WEBP image.' }))
    if (file.size > MAX_BYTES) return setErrors((e) => ({ ...e, image: 'Image must be 2MB or smaller.' }))
    const r = new FileReader()
    r.onload = () => { setImage(r.result); setErrors((e) => ({ ...e, image: undefined })) }
    r.readAsDataURL(file)
  }

  const cmd = (c, v) => (e) => { e.preventDefault(); document.execCommand(c, false, v); editor.current?.focus() }
  const link = (e) => { e.preventDefault(); const u = window.prompt('Link URL'); if (u) document.execCommand('createLink', false, u) }

  const save = async (e) => {
    e.preventDefault()
    const err = {}
    if (!form.title.trim()) err.title = 'Enter a title.'
    if (!ADD_NEWS_CATEGORIES.includes(form.category)) err.category = 'Select an available category.'
    if (!image) err.image = 'Upload a featured image.'
    if (!editor.current?.innerText.trim()) err.content = 'Write the article content.'
    if (!form.metaTitle.trim()) err.metaTitle = 'Enter a meta title.'
    if (!form.metaDescription.trim()) err.metaDescription = 'Enter a meta description.'
    else if (form.metaDescription.length > MAX_META_DESCRIPTION_LENGTH) err.metaDescription = `Keep the meta description within ${MAX_META_DESCRIPTION_LENGTH} characters.`
    if (!form.author) err.author = 'Select an author.'
    setErrors(err)
    if (Object.keys(err).length) return

    setSaving(true)
    setSaveError('')
    const payload = {
      title: form.title, category: form.category, image,
      content: editor.current.innerHTML, author: form.author,
      status: form.status === 'Publish' ? 'Published' : 'Draft',
      summary: form.metaDescription,
      meta: { title: form.metaTitle, description: form.metaDescription },
    }
    try {
      const response = await fetch(existingArticle ? `/api/admin/articles/${encodeURIComponent(existingArticle.id)}` : '/api/admin/articles', {
        method: existingArticle ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      await readApiResponse(response, 'Could not save article.')
      navigate('/admin/articles')
    } catch (error) {
      setSaveError(error.message || 'Could not save article.')
    } finally {
      setSaving(false)
    }
  }

  const Err = ({ k }) => (errors[k] ? <span className="err">{errors[k]}</span> : null)
  const tb = (Icon, c, label, v) => (
    <button type="button" onMouseDown={cmd(c, v)} aria-label={label}><Icon size={16} /></button>
  )

  if (loadingExisting) return <section className="card article-skeleton" aria-hidden="true"><span className="article-skeleton-title" /><span className="article-skeleton-line" /><span className="article-skeleton-line short" /></section>
  if (id && !existingArticle) {
    return <section className="card"><h2>Article not found</h2>{saveError && <p className="err">{saveError}</p>}<Link to="/admin/articles" className="link">Back to articles</Link></section>
  }

  return (
    <form className="add-grid" onSubmit={save} noValidate>
      <section className="card">
        <h2 className="accent dash">{existingArticle ? 'Edit News Article' : 'Add News Article'}</h2>
        {saveError && <p className="err" role="alert">{saveError}</p>}

        <label className="fl"><span className="field-label">Title <i>*</i></span>
          <input value={form.title} onChange={set('title')} placeholder="Enter news title" /><Err k="title" />
        </label>

        <label className="fl"><span className="field-label">Category <i>*</i></span>
          <span className="selectwrap">
            <select value={ADD_NEWS_CATEGORIES.includes(form.category) ? form.category : ''} onChange={set('category')}>
              <option value="">Select category</option>
              {ADD_NEWS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={16} />
          </span>
          <Err k="category" />
        </label>

        <div className="fl"><span className="field-label">Featured Image <i>*</i></span>
          <div
            className="drop" role="button" tabIndex={0}
            onClick={() => fileInput.current.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInput.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); readFile(e.dataTransfer.files[0]) }}
          >
            {image ? <img src={image} alt="Featured preview" /> : (
              <>
                <b><ImageIcon size={18} /> Upload Image</b>
                <span>Click to upload or drag and drop</span>
                <small>Supported formats: JPG, PNG, WEBP (Max size: 2MB)</small>
              </>
            )}
            <input ref={fileInput} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => readFile(e.target.files[0])} />
          </div>
          <Err k="image" />
        </div>

        <div className="fl"><span className="field-label">Content <i>*</i></span>
          <div className="editor">
            <div className="toolbar">
              <select defaultValue="P" onChange={(e) => { document.execCommand('formatBlock', false, e.target.value); editor.current.focus() }}>
                <option value="P">Paragraph</option><option value="H2">Heading 2</option><option value="H3">Heading 3</option>
              </select>
              <span className="sep" />
              {tb(Bold, 'bold', 'Bold')}{tb(Italic, 'italic', 'Italic')}{tb(Underline, 'underline', 'Underline')}{tb(Strikethrough, 'strikeThrough', 'Strikethrough')}
              <button type="button" onMouseDown={link} aria-label="Link"><Link2 size={16} /></button>
              {tb(Quote, 'formatBlock', 'Quote', 'BLOCKQUOTE')}
              <span className="sep" />
              {tb(List, 'insertUnorderedList', 'Bulleted list')}{tb(ListOrdered, 'insertOrderedList', 'Numbered list')}
              <span className="sep" />
              {tb(AlignLeft, 'justifyLeft', 'Align left')}{tb(AlignCenter, 'justifyCenter', 'Align center')}{tb(AlignRight, 'justifyRight', 'Align right')}{tb(AlignJustify, 'justifyFull', 'Justify')}
              <span className="sep" />
              {tb(Undo2, 'undo', 'Undo')}{tb(Redo2, 'redo', 'Redo')}
            </div>
            <div ref={editor} className="editable" contentEditable suppressContentEditableWarning data-placeholder="Write your news content here..." onInput={(e) => setContentStats(getContentStats(e.currentTarget.innerText))} />
          </div>
          <div className="editor-stats" aria-live="polite">
            {contentStats.words} {contentStats.words === 1 ? 'word' : 'words'} · {contentStats.sentences} {contentStats.sentences === 1 ? 'sentence' : 'sentences'}
          </div>
          <Err k="content" />
        </div>
      </section>

      <aside className="card side">
        <label className="fl"><span className="field-label">Meta Title <i>*</i></span>
          <input value={form.metaTitle} onChange={set('metaTitle')} placeholder="Enter meta title" /><Err k="metaTitle" />
        </label>
        <label className="fl"><span className="field-label">Meta Description <i>*</i></span>
          <textarea rows="4" maxLength={MAX_META_DESCRIPTION_LENGTH} value={form.metaDescription} onChange={set('metaDescription')} placeholder="Enter meta description" /><span className="muted">{form.metaDescription.length}/{MAX_META_DESCRIPTION_LENGTH} characters</span><Err k="metaDescription" />
        </label>
        <hr />
        <h3>Publish Settings</h3>
        <label className="fl"><span className="field-label">Author <i>*</i></span>
          <span className="selectwrap">
            <select value={form.author} onChange={set('author')}>
              <option value="">Select author</option>
              {AUTHORS.map((a) => <option key={a}>{a}</option>)}
            </select>
            <ChevronDown size={16} />
          </span>
          <Err k="author" />
        </label>
        <div className="fl"><span className="field-label">Status <i>*</i></span>
          <div className="radios">
            {['Publish', 'Draft'].map((s) => (
              <label key={s}><input type="radio" name="status" value={s} checked={form.status === s} onChange={set('status')} /> {s}</label>
            ))}
          </div>
        </div>
        <button type="submit" className="btn-red wide" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : existingArticle ? 'Save Changes' : 'Save Article'}</button>
      </aside>
    </form>
  )
}

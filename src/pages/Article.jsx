import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Home, Calendar, Clock, Tag, Languages, RefreshCw } from 'lucide-react'
import { mapPublishedArticle } from '../data.js'
import Socials from '../components/Socials.jsx'
import PageMeta from '../components/PageMeta.jsx'

function getTranslationBlocks(contentHtml) {
  const parsed = new DOMParser().parseFromString(contentHtml, 'text/html')
  const blocks = [...parsed.body.querySelectorAll('h2, h3, p, blockquote, li')]
    .map((element) => ({
      type: ['H2', 'H3'].includes(element.tagName) ? 'heading' : 'paragraph',
      text: element.textContent.trim(),
    }))
    .filter((block) => block.text)

  if (blocks.length) return blocks

  const plainText = parsed.body.textContent.replace(/\s+/g, ' ').trim()
  return plainText ? [{ type: 'paragraph', text: plainText }] : []
}

export default function Article() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const rangeQuery = searchParams.get('range') ? `?range=${encodeURIComponent(searchParams.get('range'))}` : ''
  const searchRangeQuery = searchParams.get('range') ? `&range=${encodeURIComponent(searchParams.get('range'))}` : ''
  const [publishedArticle, setPublishedArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [translation, setTranslation] = useState(null)
  const [translationStatus, setTranslationStatus] = useState('loading')
  const [translationAttempt, setTranslationAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setPublishedArticle(null)
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
  const structuredData = useMemo(() => a ? ({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: a.title,
    description: a.summary,
    image: a.image ? [new URL(a.image, window.location.origin).href] : undefined,
    datePublished: a.publishedAt || a.createdAt,
    dateModified: a.updatedAt || a.publishedAt || a.createdAt,
    author: { '@type': 'Organization', name: a.author || 'YHO News' },
    publisher: { '@type': 'Organization', name: 'YHO News', logo: { '@type': 'ImageObject', url: `${window.location.origin}/logo.png` } },
    mainEntityOfPage: new URL(`/article/${encodeURIComponent(a.id)}`, window.location.origin).href,
  }) : null, [a])

  useEffect(() => {
    if (!a) return undefined

    const controller = new AbortController()
    const blocks = getTranslationBlocks(a.contentHtml)
    setTranslation(null)
    setTranslationStatus('loading')

    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: [a.title, ...blocks.map((block) => block.text)] }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json()
        setTranslation({
          title: data.translations[0],
          blocks: blocks.map((block, index) => ({ ...block, text: data.translations[index + 1] })),
        })
        setTranslationStatus('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setTranslationStatus('error')
      })

    return () => controller.abort()
  }, [a, translationAttempt])

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
      <article>
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
        <section className="card hindi-translation" lang="hi">
          <h2><Languages size={19} /> हिंदी में खबर</h2>
          {translationStatus === 'loading' && <div className="translation-skeleton" aria-hidden="true"><span /><span /><span /></div>}
          {translationStatus === 'error' && (
            <div className="translation-error">
              <p>अनुवाद अभी उपलब्ध नहीं है।</p>
              <button type="button" className="translation-retry" onClick={() => setTranslationAttempt((attempt) => attempt + 1)}>
                <RefreshCw size={14} /> फिर कोशिश करें
              </button>
            </div>
          )}
          {translation && (
            <div className="hindi-copy">
              <h3>{translation.title}</h3>
              {translation.blocks.map((block, index) => block.type === 'heading'
                ? <h4 key={index}>{block.text}</h4>
                : <p key={index}>{block.text}</p>)}
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

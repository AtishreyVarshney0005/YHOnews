import { useEffect } from 'react'

const REVEAL_SELECTOR = [
  '.page > .home-date-filter',
  '.page > .headline-strip',
  '.home-top > *',
  '.home-news-sections > *',
  '.home-interests-heading',
  '.interest-grid > *',
  '.page > .catpage',
  '.search-layout > *',
  '.article-layout > *',
  '.page > .contact-heading',
  '.contact-grid > *',
  '.legal > .legal-sec',
  '.page > .not-found',
  '.footer',
  '.admin-content > *',
  '.admin-login-card',
].join(', ')

export default function useScrollReveal(rootRef, routeKey) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const targets = new Set()
    let sequence = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const observer = !reducedMotion && 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        })
      }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' })
      : null

    const observe = (element) => {
      if (targets.has(element)) return
      targets.add(element)
      element.classList.add('scroll-reveal')
      element.style.setProperty('--reveal-delay', `${Math.min(sequence % 5, 4) * 65}ms`)
      sequence += 1
      if (observer) observer.observe(element)
      else element.classList.add('is-visible')
    }

    const scan = (node) => {
      if (!(node instanceof Element)) return
      if (node.matches(REVEAL_SELECTOR)) observe(node)
      node.querySelectorAll(REVEAL_SELECTOR).forEach(observe)
    }

    scan(root)
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach(scan))
    })
    mutationObserver.observe(root, { childList: true, subtree: true })

    return () => {
      mutationObserver.disconnect()
      observer?.disconnect()
    }
  }, [rootRef, routeKey])
}

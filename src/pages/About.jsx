import { useEffect, useRef } from 'react'
import { Target, Eye, ShieldCheck, Handshake, Scale, Users, Newspaper } from 'lucide-react'
import { img } from '../data.js'
import PageMeta from '../components/PageMeta.jsx'

const VALUES = [
  { Icon: ShieldCheck, title: 'Accuracy', text: 'We work to make every update clear, careful and grounded in credible information.' },
  { Icon: Handshake, title: 'Integrity', text: 'We value honest reporting and take our responsibility to readers seriously.' },
  { Icon: Scale, title: 'Fairness', text: 'We aim to give important stories context and represent different perspectives.' },
  { Icon: Users, title: 'Reader First', text: 'We make the news easy to explore, understand and share.' },
]

export default function About() {
  const pageRef = useRef(null)

  useEffect(() => {
    const page = pageRef.current
    if (!page) return undefined

    const elements = page.querySelectorAll('.about-reveal')
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'))
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.16, rootMargin: '0px 0px -35px 0px' })

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <>
    <PageMeta
      title="About YHO News | News with Context"
      description="Learn about YHO News, our mission, values and commitment to clear, useful reporting for informed readers."
      path="/about"
    />
    <div className="about-page" ref={pageRef}>
      <section className="about-hero">
        <div className="about-copy about-reveal">
          <span className="about-kicker"><Newspaper size={15} /> Independent perspective. Informed readers.</span>
          <h1>Know what matters.<br /><span>Understand why.</span></h1>
          <p className="about-lead">YHO News brings the stories shaping India and the world into one clear, easy-to-follow place.</p>
          <p>From business and technology to sports, education and culture, we help you stay up to date and see the context behind the headlines.</p>
          <div className="about-topics" aria-label="News topics">
            <span>India &amp; World</span><span>Business</span><span>Technology</span><span>More perspectives</span>
          </div>
        </div>
        <div className="about-visual about-reveal">
          <img src={img('yho-newsroom', 1000, 760)} alt="A newsroom team following the latest stories" />
          <div className="about-image-note"><span className="about-note-icon"><Newspaper size={19} /></span><span><b>News with context</b><small>Stories for a better-informed day</small></span></div>
        </div>
      </section>

      <section className="about-purpose" aria-label="Our purpose">
        <div className="card mv-card about-reveal">
          <span className="round"><Target /></span>
          <div><span className="about-card-kicker">WHY WE'RE HERE</span><h2>Our Mission</h2><p>To make reliable, timely news accessible and useful, so readers can make sense of the events shaping their lives.</p></div>
        </div>
        <div className="card mv-card about-reveal">
          <span className="round"><Eye /></span>
          <div><span className="about-card-kicker">WHAT WE'RE WORKING TOWARD</span><h2>Our Vision</h2><p>A more informed community, supported by journalism that earns trust through clarity, care and consistency.</p></div>
        </div>
      </section>

      <section className="about-values">
        <div className="about-section-heading">
          <span className="about-card-kicker">THE STANDARD WE SET</span>
          <h2 className="accent">What guides our work</h2>
          <p>Good journalism starts with respect for the facts and for the people reading them.</p>
        </div>
        <div className="values">
          {VALUES.map(({ Icon, title, text }) => (
            <div key={title} className="card value about-reveal">
              <span className="about-value-icon"><Icon size={24} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
    </>
  )
}

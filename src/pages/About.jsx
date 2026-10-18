import { Target, Eye, ShieldCheck, Handshake, Scale, Users } from 'lucide-react'
import { img } from '../data.js'

const VALUES = [
  { Icon: ShieldCheck, title: 'Accuracy', text: 'We verify facts and bring you the truth.' },
  { Icon: Handshake, title: 'Integrity', text: 'We uphold the highest journalistic standards.' },
  { Icon: Scale, title: 'Impartiality', text: 'We present balanced views without bias.' },
  { Icon: Users, title: 'Reader First', text: 'Your trust and experience matter most to us.' },
]

export default function About() {
  return (
    <>
      <div className="about-top">
        <div>
          <h1 className="accent big">About YHO News</h1>
          <h2 className="subtitle">Your Trusted Source for Latest News</h2>
          <p>YHO News is a modern digital news platform committed to delivering reliable, unbiased and timely news across India and the world. We bring you the latest updates in politics, business, technology, sports, entertainment, education and more — all in one place.</p>
          <p>Our goal is to keep you informed, help you understand the bigger picture, and give you news that matters, from trusted sources and credible journalists.</p>
        </div>
        <img className="about-img" src={img('newsdesk', 800, 500)} alt="YHUO News on a laptop" />
      </div>

      <div className="mv">
        <div className="card mv-card">
          <span className="round"><Target /></span>
          <div><h3>Our Mission</h3><p>To deliver accurate, timely and unbiased news, empowering people with the information they need to make better decisions and build a more informed world.</p></div>
        </div>
        <div className="card mv-card">
          <span className="round"><Eye /></span>
          <div><h3>Our Vision</h3><p>To become a leading and most trusted news source, recognized for our integrity, credibility and commitment to journalistic excellence, both in India and globally.</p></div>
        </div>
      </div>

      <h2 className="accent">Our Values</h2>
      <div className="values">
        {VALUES.map(({ Icon, title, text }) => (
          <div key={title} className="card value">
            <Icon size={34} color="#e8141c" />
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </>
  )
}

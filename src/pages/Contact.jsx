import { useState } from 'react'
import { Mail, Phone, MapPin } from 'lucide-react'

const SUBJECTS = ['General enquiry', 'News tip', 'Advertising', 'Feedback', 'Technical issue']

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    const err = {}
    if (!form.name.trim()) err.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = 'Enter a valid email address.'
    if (!form.subject) err.subject = 'Select a subject.'
    if (!form.message.trim()) err.message = 'Enter your message.'
    setErrors(err)
    if (Object.keys(err).length === 0) {
      setSent(true)
    }
  }

  return (
    <>
      <div className="contact-heading">
        <h1 className="accent big">Get in Touch</h1>
        <p className="subtitle">Have a question, a news tip, or feedback? We'd love to hear from you.</p>
      </div>
      <div className="contact-grid">
        <aside className="card info" aria-label="Contact information">
          <div className="info-heading">
            <span className="contact-kicker">CONTACT DETAILS</span>
            <h2>We're here to help</h2>
            <p>Reach out using whichever contact method works best for you.</p>
          </div>
          <div className="info-item">
            <span className="round solid" aria-hidden="true"><Mail /></span>
            <div><h3>Email us</h3><a href="mailto:yhoindia@gmail.com">yhoindia@gmail.com</a></div>
          </div>
          <div className="info-item">
            <span className="round solid" aria-hidden="true"><Phone /></span>
            <div><h3>Call us</h3><a href="tel:+919808900159">+91 98089 00159</a><p>9 AM–6 PM, Monday to Friday</p></div>
          </div>
          <div className="info-item">
            <span className="round solid" aria-hidden="true"><MapPin /></span>
            <div><h3>Visit us</h3><p>Shivam Lokvani Kendra<br />Aligarh, Uttar Pradesh 202001</p></div>
          </div>
        </aside>

        <form className="card form" onSubmit={submit} noValidate aria-labelledby="contact-form-title">
          {sent && <p className="form-notice" role="status">This form isn't connected to message delivery yet. Please <a href="mailto:yhoindia@gmail.com">email us directly</a>.</p>}
          <div className="form-heading">
            <h2 id="contact-form-title">Send us a message</h2>
            <p>We usually respond within one working day.</p>
          </div>
          <p className="required-note"><i aria-hidden="true">*</i> Required fields</p>
          <label htmlFor="contact-name">
            <span className="field-label">Your Name <i aria-hidden="true">*</i></span>
            <input id="contact-name" name="name" autoComplete="name" required aria-required="true" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'contact-name-error' : undefined} value={form.name} onChange={set('name')} placeholder="Enter your name" />
            {errors.name && <span className="err" id="contact-name-error">{errors.name}</span>}
          </label>
          <label htmlFor="contact-email">
            <span className="field-label">Email Address <i aria-hidden="true">*</i></span>
            <input id="contact-email" name="email" type="email" autoComplete="email" required aria-required="true" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'contact-email-error' : undefined} value={form.email} onChange={set('email')} placeholder="Enter your email address" />
            {errors.email && <span className="err" id="contact-email-error">{errors.email}</span>}
          </label>
          <label htmlFor="contact-subject">
            <span className="field-label">Subject <i aria-hidden="true">*</i></span>
            <select id="contact-subject" name="subject" required aria-required="true" aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? 'contact-subject-error' : undefined} value={form.subject} onChange={set('subject')}>
              <option value="">Select a subject</option>
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
            {errors.subject && <span className="err" id="contact-subject-error">{errors.subject}</span>}
          </label>
          <label htmlFor="contact-message">
            <span className="field-label">Message <i aria-hidden="true">*</i></span>
            <textarea id="contact-message" name="message" rows="5" required aria-required="true" aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'contact-message-error' : undefined} value={form.message} onChange={set('message')} placeholder="Tell us how we can help..." />
            {errors.message && <span className="err" id="contact-message-error">{errors.message}</span>}
          </label>
          <button className="btn-red wide" type="submit">Send Message</button>
        </form>
      </div>
    </>
  )
}

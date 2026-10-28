import PageMeta from '../components/PageMeta.jsx'

function Legal({ title, updated, sections }) {
  const path = title === 'Privacy Policy' ? '/privacy' : '/terms'
  return (
    <>
      <PageMeta
        title={`${title} | YHO News`}
        description={`${title} for the YHO News website.`}
        path={path}
      />
      <section className="card legal">
        <h1 className="accent">{title}</h1>
        <p className="muted">Last Updated: {updated}</p>
        {sections.map((s, i) => (
          <div key={s.h} className="legal-sec">
            <h2>{i + 1}. {s.h}</h2>
            {s.p && <p>{s.p}</p>}
            {s.list && (
              <ul>
                {s.list.map(([b, t]) => <li key={t}>{b && <b>{b} </b>}{t}</li>)}
              </ul>
            )}
          </div>
        ))}
      </section>
    </>
  )
}

export const Privacy = () => (
  <Legal
    title="Privacy Policy"
    updated="21 Oct 2026"
    sections={[
      { h: 'Who We Are and Scope', p: 'YHO News (\"we\", \"us\", or \"our\") operates this news website from Aligarh, Uttar Pradesh, India. This policy explains how information may be handled when you visit the site or contact us. It applies to this website and does not cover third-party websites or services.' },
      { h: 'Information You Provide', p: 'You may choose to contact us by email or telephone and provide your name, contact details, and the contents of your enquiry. The website contact form is not connected to message delivery: information entered there stays in your browser and is not submitted to YHO News through that form. Please do not include sensitive personal information in an enquiry.' },
      { h: 'Technical Information and Third Parties', p: 'When a page or API is requested, the hosting and service providers needed to deliver the site may receive technical information such as your IP address, browser, device, request time, and requested resource in their server logs. Some editorial and decorative images may be delivered by third-party image providers, which may receive connection information such as your IP address. Third-party providers process information under their own terms and privacy policies.' },
      { h: 'Cookies and Similar Technologies', p: 'YHO News does not currently use analytics, advertising, or cross-site tracking cookies. Administrative features may use browser session storage or essential session technology to maintain admin access. This is not used to track readers across websites. Your browser settings can control some storage and cookies, but disabling essential session technology may affect administrative features.' },
      { h: 'How We Use Information', list: [
        ['', 'To operate, maintain, and secure the website and its administrative services.'],
        ['', 'To respond to enquiries that you send to us by email or telephone.'],
        ['', 'To diagnose technical issues and prevent misuse, where relevant technical logs are available to us or our service providers.'],
      ] },
      { h: 'When Information May Be Shared', p: 'We do not sell personal information. Information may be handled by hosting or technical providers to operate the site, or disclosed where required by law or necessary to protect the rights, safety, and security of YHO News, its users, or others.' },
      { h: 'Retention and Security', p: 'We keep correspondence and technical records only for as long as reasonably needed for the purpose for which they were collected, to address an enquiry, maintain security, or meet legal obligations. Retention periods may differ by record and provider. We take reasonable steps to protect information, but no website or method of transmission can be guaranteed completely secure.' },
      { h: 'Your Requests', p: 'You may contact us to ask about personal information you have sent directly to us, or to request correction or deletion where applicable. We may need to verify your identity and may retain information where required or permitted by law. Contact us at yhoindia@gmail.com.' },
      { h: 'Children', p: 'This website is intended for a general audience and is not specifically directed to children. If you believe a child has provided personal information to us directly, please contact us so we can review the request.' },
      { h: 'Changes and Contact', p: 'We may update this policy when our practices or applicable requirements change. The updated date above indicates the latest revision. For privacy questions, contact yhoindia@gmail.com or write to YHO News, Shivam Lokvani Kendra, Aligarh, Uttar Pradesh 202001, India.' },
    ]}
  />
)

export const Terms = () => (
  <Legal
    title="Terms & Conditions"
    updated="21 Oct 2026"
    sections={[
      { h: 'Acceptance and Publisher', p: 'These Terms & Conditions apply to your use of the YHO News website. By using the site, you agree to these terms. If you do not agree, please do not use the site. YHO News is operated from Aligarh, Uttar Pradesh, India. Questions can be sent to yhoindia@gmail.com.' },
      { h: 'Use of the Website', p: 'You may use the website for lawful personal and informational purposes. You must not attempt to disrupt, damage, gain unauthorised access to, or interfere with the website, its systems, or other users’ access.' },
      { h: 'Content and Intellectual Property', p: 'Articles, branding, and other original material created by YHO News are protected by applicable intellectual property laws. You may not reproduce, republish, or commercially use that material without permission, except as allowed by law. Third-party material remains the property of its respective rights holders and may be subject to separate terms; attribution or links are provided where available.' },
      { h: 'Accuracy and News Disclaimer', p: 'We aim to provide useful and accurate news, but content may be incomplete, change over time, or contain errors. News and other material is provided for general information only and is not professional, financial, medical, or legal advice. Please verify important information with appropriate primary or professional sources. To report a correction, contact yhoindia@gmail.com.' },
      { h: 'Third-Party Services and Links', p: 'The site may link to or use services operated by third parties, including weather information providers. We do not control and are not responsible for their content, availability, policies, or practices. Your use of those services is subject to their own terms and privacy policies.' },
      { h: 'Availability and Changes', p: 'We may update, suspend, or remove website features or content to maintain or improve the service. We do not guarantee uninterrupted availability and may revise these terms by posting an updated version on this page.' },
      { h: 'Limitation of Liability', p: 'To the extent permitted by applicable law, YHO News is not liable for indirect or consequential loss arising from use of, or inability to use, the website or reliance on its content. Nothing in these terms excludes liability that cannot lawfully be excluded or limits any rights you have under applicable law.' },
      { h: 'Governing Law', p: 'These terms are governed by the laws of India. Courts with appropriate jurisdiction in Aligarh, Uttar Pradesh will have jurisdiction, subject to any mandatory legal requirements that apply.' },
      { h: 'Contact', p: 'For questions about these terms or to report an issue with website content, email yhoindia@gmail.com or write to YHO News, Shivam Lokvani Kendra, Aligarh, Uttar Pradesh 202001, India.' },
    ]}
  />
)

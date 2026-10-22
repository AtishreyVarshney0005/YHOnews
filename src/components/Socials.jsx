import twitterImage from '../../twitter.png'
import whatsappImage from '../../whatsapp.png'
import { Link2, Youtube } from 'lucide-react'

const items = [
  { name: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61595695521987', image: '/social-facebook.svg', cls: 'fb' },
  { name: 'Instagram', href: 'https://www.instagram.com/yhonews/', image: '/social-instagram.svg', cls: 'ig' },
  { name: 'X', href: 'https://x.com/yhonews2001', image: twitterImage, cls: 'twitter' },
]

export default function Socials({ size = 16, whatsappShareUrl, copyLinkUrl, showFooterLinks = false }) {
  const shareUrl = whatsappShareUrl || (showFooterLinks ? window.location.origin : '')

  return (
    <div className="socials brand-socials">
      {items.map(({ name, href, image, cls }) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer" className={`social brand-social ${cls}`} aria-label={name}>
          <img src={image} alt="" width={size} height={size} />
        </a>
      ))}
      {showFooterLinks && (
        <a
          href="https://www.youtube.com/results?search_query=YHO+News"
          target="_blank"
          rel="noopener noreferrer"
          className="social brand-social yt"
          aria-label="Find YHO News on YouTube"
          title="Find YHO News on YouTube"
        >
          <Youtube size={size} aria-hidden="true" />
        </a>
      )}
      {shareUrl && (
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="social brand-social whatsapp"
          aria-label={showFooterLinks ? 'Share YHO News on WhatsApp' : 'Share on WhatsApp'}
          title={showFooterLinks ? 'Share YHO News on WhatsApp' : undefined}
        >
          <img src={whatsappImage} alt="" width={size} height={size} />
        </a>
      )}
      {copyLinkUrl && (
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(copyLinkUrl)}
          className="social brand-social copy-link"
          aria-label="Copy article link"
        >
          <Link2 size={size} />
        </button>
      )}
    </div>
  )
}

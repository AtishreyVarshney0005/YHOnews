import { Link, useSearchParams } from 'react-router-dom'
import logoImage from '../../logo.jpeg'

export default function Logo({ light = false }) {
  const [params] = useSearchParams()
  const range = params.get('range')
  return (
    <Link to={range ? `/?range=${encodeURIComponent(range)}` : '/'} className={`logo ${light ? 'light' : ''}`}>
      <img className="logo-image" src={logoImage} alt="YHO News - Your World, Your News" />
    </Link>
  )
}

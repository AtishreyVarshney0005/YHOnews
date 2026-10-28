import { NEWS_DATE_RANGES } from '../data.js'

export default function NewsDateFilter({ value, onChange }) {
  return (
    <div className="news-date-filter">
      <span className="news-date-filter-label">Filter by date</span>
      <div className="news-date-filter-options" role="group" aria-label="Filter news by date">
        {NEWS_DATE_RANGES.map((range) => (
          <button
            key={range.value}
            type="button"
            className={range.value === value ? 'on' : ''}
            aria-pressed={range.value === value}
            onClick={() => onChange(range.value)}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  )
}

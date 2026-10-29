CREATE TABLE IF NOT EXISTS yho_news_articles (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  data JSON NOT NULL,
  status VARCHAR(32) NOT NULL,
  category VARCHAR(100) NOT NULL,
  published_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL,
  view_count INT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_yho_articles_published (status, category, published_at),
  INDEX idx_yho_articles_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

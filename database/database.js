import { readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'

const seedArticlesFile = new URL('./articles.json', import.meta.url)
let pool
let databaseReady

function getPool(configuration) {
  if (!pool) {
    const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE']
    const missing = required.filter((name) => !configuration[name])
    if (missing.length) {
      throw Object.assign(new Error(`Missing required MySQL environment variables: ${missing.join(', ')}`), { status: 503 })
    }

    const port = Number(configuration.MYSQL_PORT || 3306)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw Object.assign(new Error('MYSQL_PORT must be a valid port number.'), { status: 503 })
    }

    pool = mysql.createPool({
      host: configuration.MYSQL_HOST,
      port,
      user: configuration.MYSQL_USER,
      password: configuration.MYSQL_PASSWORD,
      database: configuration.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: 'Z',
    })
  }

  return pool
}

function toMysqlDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid article date: ${value}`)
  return date.toISOString().slice(0, 23).replace('T', ' ')
}

export async function getDatabase(configuration = process.env) {
  const database = getPool(configuration)
  if (!databaseReady) {
    databaseReady = (async () => {
      await database.execute(`CREATE TABLE IF NOT EXISTS yho_news_articles (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        data JSON NOT NULL,
        status VARCHAR(32) NOT NULL,
        category VARCHAR(100) NOT NULL,
        published_at DATETIME(3) NULL,
        updated_at DATETIME(3) NOT NULL,
        view_count INT UNSIGNED NOT NULL DEFAULT 0,
        INDEX idx_yho_articles_published (status, category, published_at),
        INDEX idx_yho_articles_updated (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

      const [columns] = await database.execute(
        'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        ['yho_news_articles', 'view_count'],
      )
      if (columns.length === 0) {
        await database.execute('ALTER TABLE yho_news_articles ADD COLUMN view_count INT UNSIGNED NOT NULL DEFAULT 0')
      }

      const [countRows] = await database.execute('SELECT COUNT(*) AS count FROM yho_news_articles')
      if (Number(countRows[0].count) === 0) {
        const seedArticles = JSON.parse(await readFile(seedArticlesFile, 'utf8'))
        if (!Array.isArray(seedArticles)) throw new Error('Article seed data must be a JSON array.')
        for (let index = 0; index < seedArticles.length; index += 8) {
          const batch = seedArticles.slice(index, index + 8).filter((article) => article?.id)
          await Promise.all(batch.map((article) => database.execute(
            `INSERT IGNORE INTO yho_news_articles (id, data, status, category, published_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              article.id,
              JSON.stringify(article),
              article.status || 'Published',
              article.category || '',
              toMysqlDate(article.publishedAt),
              toMysqlDate(article.updatedAt || article.createdAt || new Date()),
            ],
          )))
        }
      }
    })().catch((error) => {
      databaseReady = null
      throw error
    })
  }

  await databaseReady
  return database
}

export async function query(sql, values = []) {
  const database = await getDatabase()
  const [rows] = await database.execute(sql, values)
  return rows
}

export async function execute(sql, values = []) {
  const database = await getDatabase()
  const [result] = await database.execute(sql, values)
  return result
}

export function articleData(value) {
  return typeof value === 'string' ? JSON.parse(value) : value
}

export function mysqlDate(value) {
  return toMysqlDate(value)
}

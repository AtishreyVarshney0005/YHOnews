# YHU News - React + Vite

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

Routes: `/` home, `/category/:slug`, `/article/:id`, `/search?q=`, `/about`, `/contact`, `/privacy`, `/terms`, `/admin`, `/admin/add`

- Admin login, article management, and image delivery use the project's internal API. Production article storage uses MySQL; local development uses `data/articles.json` unless MySQL environment variables are configured.
- The MySQL table is created automatically on first connection. If it is empty, the app imports the bundled `data/articles.json` articles.
- The article sidebar provides a Hindi translation using MyMemory with Google Translate as fallback; only the article currently being viewed is sent to the translation provider. Set `MYMEMORY_EMAIL` to identify your MyMemory quota.
- Public pages load as separate JavaScript chunks, use page-specific metadata and article structured data, and reveal content as readers scroll. Scroll effects respect reduced-motion preferences.
- `public/robots.txt` and the `/sitemap.xml` endpoint provide search-engine crawl guidance and include published article URLs.
- Set `PUBLIC_SITE_URL` to the canonical website origin when it is not `https://yhonews.co.in`.
- Keep `MYSQL_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` private.

## Deploying on cPanel

This project needs a cPanel plan that supports both **Setup Node.js App / Application Manager** and MySQL. Uploading only the built static files is not enough: the admin API, login, article management, image delivery, and sitemap need the Node.js server.

1. In cPanel **MySQL® Databases**, create a database and a database user, then assign that user to the database with all required privileges. cPanel commonly prefixes the database and username; use their full prefixed names in the app settings.
2. In **Setup Node.js App / Application Manager**, create a Node.js application for the site. Upload the project files, including `package.json` and `package-lock.json`, to its application root.
3. Configure the application environment variables:
   - `MYSQL_HOST` — usually `localhost`, unless your hosting provider specifies a different database host.
   - `MYSQL_PORT` — usually `3306`.
   - `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD` — the full cPanel database name and assigned user credentials.
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a long random `ADMIN_SESSION_SECRET`.
   - `PUBLIC_SITE_URL` — the public HTTPS address of the website.
   - Optionally, `MYMEMORY_EMAIL`.
4. Install dependencies with the cPanel application controls or `npm ci`, then build with `npm run build`. Set the startup file/command to `scripts/start.js` or `npm run start`, as supported by the cPanel Node.js application manager.
5. Restart the Node.js application. On first connection it creates the MySQL table and imports `data/articles.json` only if the table is empty. Test `/api/health`, then sign in at `/admin`.

For local admin access, copy `.env.example` to `.env` and set your values. Without MySQL variables, local article changes are written to `data/articles.json`.

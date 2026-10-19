# YHU News - React + Vite

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

Routes: `/` home, `/category/:slug`, `/article/:id`, `/search?q=`, `/about`, `/contact`, `/privacy`, `/terms`, `/admin`, `/admin/add`

- All sample content and images live in `src/data.js` (images are picsum.photos placeholders - swap for real ones).
- Vite middleware provides the API locally and on Render. Vercel uses `api/[...path].js` for the same API routes.
- For production, set `NEWS_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET`. Vercel generates the session secret through its environment configuration; keep all credentials private.

## Deploying to Vercel

1. Import this GitHub repository in Vercel. Vercel detects the Vite app and uses `vercel.json` to build the `dist` directory and route client-side pages.
2. Create a **private Vercel Blob** store in the project's Storage tab and connect it to Production. The store provides the server-side credentials used by the API to persist article data.
3. Add `NEWS_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a long random `ADMIN_SESSION_SECRET` to the project's Production environment variables. Never commit or share these values.
4. Deploy the project and sign in at `/admin`.

On Vercel, published and draft articles are stored in the private Blob store rather than the function filesystem. Local development and Render continue to use `data/articles.json`.

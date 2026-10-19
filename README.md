# YHU News - React + Vite

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

Routes: `/` home, `/category/:slug`, `/article/:id`, `/search?q=`, `/about`, `/contact`, `/privacy`, `/terms`, `/admin`, `/admin/add`

- All sample content and images live in `src/data.js` (images are picsum.photos placeholders - swap for real ones).
- The app API is provided by Vite middleware, so use `npm run preview` to run the built app with its API locally. A static-only host will not provide the API routes.
- For a production preview or Render runtime, set `NEWS_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET`. To preview locally, put them in `.env.local` using `.env.example` as a template. The Render Blueprint prompts for the news API key and admin credentials and generates the session secret.

## Deploying a demo to Render

1. Push this repository to GitHub and create a new Blueprint in Render from the repository. Render will detect `render.yaml`.
2. Enter your NewsAPI key and a unique admin email and password when prompted. Do not use credentials that are used elsewhere.
3. Deploy the `yhu-news-demo` web service. Open its URL and sign in at `/admin`.

This demo runs the built app with Vite's preview server so its existing API middleware is available. Articles are stored in `data/articles.json` on the service filesystem; edits are for demonstration and may be lost when Render redeploys or replaces the service. Add persistent storage or a database before using it for permanent content or production workloads.

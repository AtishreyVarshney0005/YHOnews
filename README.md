# YHU News - React + Vite

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Routes: `/` home, `/category/:slug`, `/article/:id`, `/search?q=`, `/about`, `/contact`, `/privacy`, `/terms`, `/admin`, `/admin/add`

- All sample content and images live in `src/data.js` (images are picsum.photos placeholders - swap for real ones).
- Admin pages have no login yet. Saved articles go to localStorage; replace the `TODO` in `src/admin/AddNews.jsx` with your API call.
- For client-side routing on a static host, redirect all paths to `index.html`.

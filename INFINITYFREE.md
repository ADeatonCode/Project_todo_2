# Deploy this copy to InfinityFree + Render

Do this on `Project_todo_2` only. The original `PROJECT_TODO` can stay running locally.

1. **MongoDB Atlas** — In Network Access, allow `0.0.0.0/0` so Render can reach the cluster. Keep `MONGO_URI` in `backend/.env` (never commit it).
2. **Render backend** — Create a Web Service from the `backend` folder. Set env vars `MONGO_URI` (same value as local), `ADMIN_EMAIL=acdelgato@gmail.com`, and `PORT` (Render usually sets this). Start command: `node src/server.js`. Copy the live URL, e.g. `https://your-app.onrender.com`. After a deploy, log out and log back in so `role=head` is stored in the browser.
3. **CORS** — On Render, also set `FRONTEND_ORIGIN=https://YOUR-SITE.infinityfreeapp.com` (your real InfinityFree URL, no trailing slash).
4. **Frontend API URL** — Before building, set `VITE_API_URL` to the Render URL (no trailing slash), e.g. `VITE_API_URL=https://your-app.onrender.com`. Vite bakes this in at **build** time; local `.env` still defaults to `http://localhost:5000` for class.
5. **Build** — From the project root: `npm install` then `npm run build`. This creates `dist/` and copies `public/.htaccess` into it.
6. **InfinityFree upload** — Upload the **contents of `dist/`** (not the `dist` folder itself) into `htdocs/Projects/project_todo_2/`. Do **not** replace the lagoon root `htdocs/index.html`. Confirm `.htaccess` is in that subfolder so `/Projects/project_todo_2/tasks` and the other SPA routes reload correctly. A ready zip is `project_todo_2-infinityfree.zip` (files at the zip root).
7. **Check CORS + API** — Open the InfinityFree site, sign up / log in, and load tasks. If the browser blocks requests, `FRONTEND_ORIGIN` on Render must match the site origin exactly (`https://...`).
8. **Local class work** — Leave `VITE_API_URL=http://localhost:5000` and `FRONTEND_ORIGIN` unset (or commented) in local env files so Vite on port 5173 still talks to Express on 5000.

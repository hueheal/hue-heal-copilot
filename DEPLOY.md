# Deploying the Studio Co-pilot online

The **backend is already online** (Supabase project `dxniwcwoacyrjlyhymoh`). This
guide puts the **frontend** live on **Netlify**, connected to a **GitHub repo** so
every push auto-deploys. No server runs — Netlify serves the static Vite build.

---

## 1. Push the code to GitHub

The repo is already initialized and committed locally on branch `main`.

1. Create a new **empty** repo at https://github.com/new
   (name it e.g. `hue-heal-copilot`; **don't** add a README/.gitignore — the repo already has them).
2. Copy the commands GitHub shows under **"…or push an existing repository"**, or run:

   ```bash
   cd /Users/maria/Claude/hue-heal-copilot
   git remote add origin https://github.com/<your-username>/hue-heal-copilot.git
   git push -u origin main
   ```

`.env.local` (your keys) is git-ignored and will **not** be uploaded. Good.

---

## 2. Connect Netlify to the repo

1. Sign in at https://app.netlify.com (sign in with GitHub — easiest).
2. **Add new site → Import an existing project → GitHub →** pick `hue-heal-copilot`.
3. Netlify auto-detects the settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   Leave them as-is.
4. **Before the first deploy**, add the environment variables (next step). Then **Deploy**.

You'll get a URL like `https://hue-heal-copilot.netlify.app`.

---

## 3. Set environment variables in Netlify

**Site configuration → Environment variables → Add a variable** (add both).
Copy the values from your local `.env.local`:

| Key                       | Value                                            |
| ------------------------- | ------------------------------------------------ |
| `VITE_SUPABASE_URL`       | (the `https://….supabase.co` line in .env.local) |
| `VITE_SUPABASE_ANON_KEY`  | (the `eyJ…` anon key line in .env.local)         |

Both are **public** keys — safe in a browser bundle. No secret keys go here;
those live on the edge functions.

If you set these *after* the first build, trigger **Deploys → Trigger deploy → Clear cache and deploy**.

---

## 4. Point Supabase auth at the live URL (magic-link login)

Otherwise sign-in emails will redirect back to `localhost`.

1. Open https://supabase.com/dashboard/project/dxniwcwoacyrjlyhymoh/auth/url-configuration
2. **Site URL:** set to your Netlify URL (e.g. `https://hue-heal-copilot.netlify.app`).
3. **Redirect URLs:** add `https://hue-heal-copilot.netlify.app/**`
   (keep `http://localhost:5273/**` too so local dev still works).

Edge-function CORS is already `*`, so AI images / newsletter sends work from the
live site with no change.

---

## 5. (Optional) Custom domain — copilot.hueandheal.com

1. Netlify: **Domain management → Add a domain →** `copilot.hueandheal.com`.
2. At your DNS host (Wix today, or Cloudflare after the newsletter DNS move), add the
   **CNAME** record Netlify shows (points the subdomain at your Netlify site).
3. Netlify provisions HTTPS automatically once DNS resolves.
4. Redo **step 4** with the custom URL added to Supabase's Site URL + Redirect URLs.

---

## Updating the live site later

```bash
git add -A && git commit -m "your change"
git push
```

Netlify rebuilds and redeploys automatically within a minute.

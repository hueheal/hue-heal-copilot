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

## 5. Custom domain — copilotadmin.hueandheal.com

This mirrors exactly how `maria.hueandheal.com` already works: a **CNAME record in
Wix DNS** pointing the subdomain at a Netlify site. (`maria` → `jolly-swan-f73b00.netlify.app`.)
This is a web CNAME — unrelated to the subdomain-MX limitation that blocked Resend.

1. **Netlify:** Site → **Domain management → Add a domain →** enter
   `copilotadmin.hueandheal.com` → **Add domain**. Because DNS lives at Wix (not
   Netlify), Netlify marks it "awaiting external DNS" and shows the **CNAME target**
   to use (your site's `<name>.netlify.app`).

2. **Wix DNS:** Wix dashboard → **Domains → hueandheal.com → Manage DNS Records**
   (Advanced). Under **CNAME (Alias)** records, **+ Add Record**:
   - **Host / Name:** `copilotadmin`
   - **Value / Points to:** the `<name>.netlify.app` target Netlify gave you
   - **TTL:** leave default
   Save. (This is the same record type already set for `maria`.)

3. Wait for DNS to propagate (usually minutes, up to ~1h). Netlify then
   **auto-provisions an HTTPS certificate** — no action needed.

4. Redo **step 4** with the custom URL: set Supabase **Site URL** to
   `https://copilotadmin.hueandheal.com` and add `https://copilotadmin.hueandheal.com/**`
   to **Redirect URLs**. (You can set this as the primary domain in Netlify so the
   raw `*.netlify.app` URL redirects to it.)

---

## Updating the live site later

```bash
git add -A && git commit -m "your change"
git push
```

Netlify rebuilds and redeploys automatically within a minute.

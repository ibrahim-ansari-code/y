# Landright Export – Next.js Landing Page

Next.js 14 app (App Router) with Tailwind CSS. Ready for **automatic deployment on Vercel**.

---

## Deploy on Vercel (automatic)

1. **Connect this repo to Vercel**
   - Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
   - Import your GitHub repository (this repo).
   - Vercel will detect Next.js from `package.json` and `vercel.json`.

2. **Use these settings** (usually auto-detected):
   - **Framework Preset**: Next.js
   - **Root Directory**: leave **empty** or set to `.`
   - **Build Command**: `npm run build` (default)
   - **Install Command**: `npm install` (default)
   - **Output Directory**: leave **empty** (Next.js uses `.next` automatically; do not set it in the UI)

3. **Deploy**
   - Click **Deploy**. Every push to the default branch will trigger a new deployment.
   - Preview deployments are created for other branches and pull requests.

### If you see 404 after deploy
   - In Vercel **Project Settings → General**: set **Root Directory** to `.` or leave empty.
   - Ensure **Framework Preset** is **Next.js**.
   - Leave **Output Directory** empty, then **Redeploy**.

---

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How this app works

- **Variant selection**: `app/page.tsx` picks one of 4 variants per visit (sessionStorage pool so each variant is shown once before any repeat).
- **Click tracking**: The wrapper in `app/page.tsx` sends a beacon to the Landright backend (`POST /beacon`) on button/link clicks; clicks are keyed by repo, layer, and variant_id.
- **Time on page**: Total time on page is sent to `POST /beacon-time` when the user hides the tab or leaves; a heartbeat every 30s also sends incremental time so Supabase gets data even if the unload beacon is dropped.
- **Section visibility**: Elements with `data-landright-section` (e.g. Hero, Features, Footer) are observed; when a section leaves view or the user leaves the page, view duration is sent to `POST /beacon-time` with `section_id` and to PostHog as `section_viewed` events. In Supabase, section-level time appears in `time_events.section_id` and in the `time_by_section` view.
- **PostHog session replay**: If Landright configured a PostHog key when building this bundle, session replays are sent to Landright's PostHog and tagged with `repo_full_name`, `layer`, and `variant_id`. No env vars are required from the deployer.
- **The 4 variant files** (`app/variants/variant-1.tsx` … `variant-4.tsx`) are the page content; the root page handles selection and tracking.

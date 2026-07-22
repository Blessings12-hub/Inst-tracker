# inst-tracker

Instagram analytics for creators and small businesses — growth, engagement,
and content insights, built entirely on Instagram's **official Graph API**.

## What this does (and deliberately doesn't)

Only data Meta's Graph API actually exposes for a Business/Creator account
the user connects themselves:

- Follower count & growth over time
- Reach, impressions, profile views
- Per-post likes/comments/reach, engagement rate
- Top commenters across your last 30 posts
- Best posting time (derived from your own post history)
- AI caption & hashtag suggestions (no Instagram data needed for this part)

Deliberately excluded: unfollower tracking, ghost followers, follow-back
ratio, "top likers" — none of these have an official API path without
scraping private endpoints or handling user passwords directly, both of
which risk getting users' accounts banned and violate Instagram's Terms of
Service.

## Stack

- **Frontend:** React + Vite, React Router, Recharts. Plain CSS design
  tokens in `src/index.css`.
- **Backend:** Supabase Edge Functions (Deno) — OAuth token exchange, all
  Graph API calls, AI suggestions. The frontend never talks to Meta or
  Anthropic directly.
- **Database:** Supabase Postgres. `profiles` (per-user account info),
  `insights` (dashboard data), `instagram_tokens` (access tokens — RLS-locked,
  no client access at all, only the service role inside Edge Functions can
  touch it).
- **Auth:** Supabase Auth. There's no separate email/password step —
  connecting Instagram *is* the login. `exchange-instagram-code` mints a
  session via a server-generated magic-link token hash.
- **Scheduling:** `pg_cron`, included on Supabase's free tier — no paid plan
  needed for the daily refresh or weekly report jobs.

## One-time setup

### 1. Meta app (developers.facebook.com)
Same as before: create a Business-type app, add the Instagram Graph API
product, request `instagram_basic`, `instagram_manage_insights`,
`pages_show_list`, `pages_read_engagement`, and add your OAuth redirect URI
(e.g. `http://localhost:5173/auth/callback`). Note your App ID and Secret.

### 2. Supabase project
1. Create a project at supabase.com/dashboard.
2. Note your **Project URL**, **anon public key**, and **service role key**
   (Project Settings -> API) — the service role key is only ever used
   server-side, never in frontend code.
3. Install the CLI and link the project:
   ```
   npm install -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   ```
4. Apply the schema:
   ```
   supabase db push
   ```

### 3. Edge Function secrets
```
supabase secrets set META_APP_ID=xxx
supabase secrets set META_APP_SECRET=xxx
supabase secrets set ANTHROPIC_API_KEY=xxx
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
injected automatically into every Edge Function — no need to set those.

### 4. Deploy the Edge Functions
```
supabase functions deploy exchange-instagram-code
supabase functions deploy refresh-insights
supabase functions deploy refresh-insights-all
supabase functions deploy disconnect-instagram
supabase functions deploy suggest-caption
supabase functions deploy suggest-hashtags
supabase functions deploy weekly-report-all
```

### 5. Schedule the cron jobs
In the Supabase Dashboard -> SQL Editor, run (fill in your project's
function URL and service role key):
```sql
select cron.schedule(
  'daily-refresh',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.functions.supabase.co/refresh-insights-all',
    headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>'),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'weekly-report',
  '0 8 * * 1',
  $$
  select net.http_post(
    url := 'https://<project-ref>.functions.supabase.co/weekly-report-all',
    headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>'),
    body := '{}'::jsonb
  );
  $$
);
```
Prefer not to paste the service role key into a SQL migration long-term —
once things are working, move it into Supabase Vault and reference it from
there instead (Dashboard -> Vault).

### 6. Frontend env
```
cd frontend
cp .env.example .env.local
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_META_APP_ID
```

## Running locally

```
supabase start                 # local Postgres + Auth + Functions
supabase functions serve       # Edge Functions, in another terminal

cd frontend && npm install
npm run dev
```

## Deploying

```
supabase db push
supabase functions deploy <name>   # for each changed function
cd frontend && npm run build
# host frontend/dist on Vercel, Cloudflare Pages, or Netlify (all free tier)
```

## Billing (Premium tier)

Stripe Checkout still isn't wired up — the "Upgrade" button in
`frontend/src/pages/Premium.jsx` is a placeholder.

## Email (weekly reports)

`weekly-report-all` currently only logs which users are due a report — it
doesn't send anything yet. Wire in Resend (3,000 free emails/month) inside
that function before shipping Premium.

## Pushing to GitHub

```
cd inst-tracker
git init
git add .
git commit -m "inst-tracker MVP scaffold"
git branch -M main
git remote add origin https://github.com/<you>/inst-tracker.git
git push -u origin main
```

## Project structure

```
inst-tracker/
├── frontend/                 React + Vite app
│   └── src/
│       ├── pages/             Login, Dashboard, Engagement, ContentTools, Premium, Settings
│       ├── components/        NavBar, StatCard, PageHeader, SignalLine, ProtectedRoute
│       ├── context/            AuthContext (Supabase auth + profile row)
│       ├── supabase.js         Supabase client init
│       └── lib/api.js          Edge Function wrappers
├── supabase/
│   ├── config.toml
│   ├── migrations/0001_init.sql   Tables + RLS policies
│   └── functions/
│       ├── _shared/               instagram.ts, ai.ts, refreshInsights.ts, cors.ts, supabaseAdmin.ts
│       ├── exchange-instagram-code/
│       ├── refresh-insights/
│       ├── refresh-insights-all/   (daily cron)
│       ├── disconnect-instagram/
│       ├── suggest-caption/
│       ├── suggest-hashtags/
│       └── weekly-report-all/      (weekly cron)
```

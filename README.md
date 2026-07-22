# inst-tracker

Instagram analytics for creators and small businesses — growth, engagement,
and content insights, built entirely on Instagram's **official Graph API**.

## What this does (and deliberately doesn't)

This MVP only uses data Meta's Graph API actually exposes for a Business/
Creator account the user connects themselves:

- Follower count & growth over time
- Reach, impressions, profile views
- Per-post likes/comments/reach, engagement rate
- Top commenters across your last 30 posts
- Best posting time (derived from your own post history)
- AI caption & hashtag suggestions (no Instagram data needed for this part)

It intentionally does **not** include: unfollower tracking, ghost followers,
follow-back ratio, or "top likers" — none of those have an official API path.
Building them requires either scraping Instagram's private endpoints or
having users hand over their real password, both of which risk getting
users' accounts locked/banned and violate Instagram's Terms of Service. If
you want unfollower/ghost-follower tracking later, the safe route is having
users periodically upload Instagram's own "Download Your Information"
export and diffing snapshots — that's a distinct feature to design
separately, not part of this build.

## Stack

- **Frontend:** React + Vite, React Router, Recharts. Plain CSS (design
  tokens in `src/index.css`) — no UI framework, easy to port to React
  Native later since the design tokens/logic aren't tied to the DOM.
- **Backend:** Firebase Cloud Functions (Node 20) — handles the OAuth
  token exchange, all Graph API calls, and AI suggestions. The frontend
  never talks to Meta or Anthropic directly, so no secrets sit in client code.
- **Data:** Firestore. `users/{uid}` for profile, `users/{uid}/insights/latest`
  for dashboard data, `users/{uid}/private/instagram` for the access token
  (locked out of client reads entirely — see `firestore.rules`).
- **Auth:** There's no separate email/password step — connecting Instagram
  *is* the login. The OAuth callback mints a Firebase custom token tied to
  the Instagram account.

## One-time setup

### 1. Meta app (developers.facebook.com)
1. Create an app at developers.facebook.com → type "Business".
2. Add the **Instagram Graph API** product.
3. Under App Review, request `instagram_basic`, `instagram_manage_insights`,
   `pages_show_list`, `pages_read_engagement` (works unreviewed for your own
   test accounts in Development mode; needed for App Review before going live).
4. Add a valid OAuth redirect URI, e.g. `http://localhost:5173/auth/callback`
   for local dev, plus your production URL later.
5. Note your **App ID** and **App Secret**.

### 2. Firebase project
1. Create a project at console.firebase.google.com.
2. Enable **Firestore** (production mode) and **Authentication** (no sign-in
   method needs to be manually enabled — custom tokens work by default).
3. Enable **Cloud Functions** (requires the Blaze plan, since functions call
   external APIs).
4. Copy `.firebaserc.example` to `.firebaserc` and set your project id.

### 3. Secrets (Cloud Functions)
```
firebase functions:secrets:set META_APP_ID
firebase functions:secrets:set META_APP_SECRET
firebase functions:secrets:set ANTHROPIC_API_KEY
```

### 4. Frontend env
```
cd frontend
cp .env.example .env.local
# fill in your Firebase web app config + VITE_META_APP_ID
```

## Running locally

```
# functions
cd functions && npm install
firebase emulators:start --only functions,firestore

# frontend, in another terminal
cd frontend && npm install
npm run dev
```

## Deploying

```
firebase deploy --only functions,firestore:rules
cd frontend && npm run build
firebase deploy --only hosting
```

## Billing (Premium tier)

Stripe Checkout isn't wired up yet — the "Upgrade" button in
`frontend/src/pages/Premium.jsx` is a placeholder. To finish it: create a
Stripe Checkout session from a new Cloud Function, redirect the user there,
and use a Stripe webhook to flip `users/{uid}.plan` to `"premium"`.

## Pushing to GitHub

This was generated in a sandbox without network/GitHub access, so push it
yourself:

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
├── frontend/           React + Vite app
│   └── src/
│       ├── pages/       Login, Dashboard, Engagement, ContentTools, Premium, Settings
│       ├── components/  NavBar, StatCard, PageHeader, SignalLine, ProtectedRoute
│       ├── context/      AuthContext (Firebase auth + Firestore profile)
│       └── lib/api.js    Cloud Function callable wrappers
├── functions/           Firebase Cloud Functions
│   ├── index.js          exchangeInstagramCode, refreshInsights, suggestCaption, ...
│   └── lib/
│       ├── instagram.js  Graph API calls
│       └── ai.js         Caption/hashtag generation
├── firestore.rules
└── firebase.json
```

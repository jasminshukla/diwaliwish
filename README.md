# Happy Diwali 2026

A Diwali greeting site: Gujarati, Hindi, and English, background music, fireworks, custom sender names, and short share links. The public design is unchanged. Production runs as one Cloudflare Worker with static assets, API routes, and a D1 database.

## What you still need to do by hand

The code is ready. These steps need your Cloudflare and Google accounts. None of them can be finished from the repository alone.

1. Install [Node.js 22+](https://nodejs.org/) and run `npm install`.
2. Log in: `npx wrangler login`.
3. Create the database: `npx wrangler d1 create diwali_wishes_db`.
4. Copy the printed `database_id` into `wrangler.jsonc` (replace the all-zero id).
5. Apply the schema: `npm run db:migrate:remote`.
6. Create a [Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) widget named `happy-diwali-2026` in managed mode. Add `bestwishes.jasminshukla.com`, plus `localhost` for local testing. Put the site key in `TURNSTILE_SITE_KEY` and the secret with `npx wrangler secret put TURNSTILE_SECRET_KEY`.
7. Create a GA4 web stream for `https://bestwishes.jasminshukla.com` and copy the measurement ID (`G-…`) into `GA_MEASUREMENT_ID` in `wrangler.jsonc`.
8. Optional, for visitor totals on `/admin`: in Google Analytics, create a service account with the Viewer role on the property. Then set `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, and `npx wrangler secret put GA4_PRIVATE_KEY` (paste the PEM, with newlines as `\n`).
9. Create a long random admin token and set it: `npx wrangler secret put ADMIN_API_TOKEN`. Also set `npx wrangler secret put RATE_LIMIT_SALT`.
10. Optional: add `bestwishes.jasminshukla.com` in Cloudflare Web Analytics and put its beacon token in `CF_BEACON_TOKEN`.
11. Deploy: `npm run deploy`.
12. Deploy attaches `bestwishes.jasminshukla.com`. The zone `jasminshukla.com` must already be on the same Cloudflare account. Confirm it under Workers & Pages → happy-diwali-2026 → Settings → Domains & Routes.

Until step 6 is done, production refuses to save new greetings. Local development can use Cloudflare’s always-pass dummy keys from `.dev.vars.example`.

## Local development

```sh
npm install
copy .dev.vars.example .dev.vars
copy .env.example .env
npm run dev
```

`npm run dev` applies the D1 migrations to the local database, then starts Vite. The Worker runtime, API, and local D1 are the same shape as production. Open the printed localhost URL.

The local admin token in `.dev.vars.example` is `local-dev-admin-token-change-me`. Open `/admin` and enter it. Change it before any shared deployment.

Useful scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local Worker, site, and D1 |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm test` | Unit tests |
| `npm run db:migrate:local` | Apply `migrations/` to local D1 |
| `npm run db:migrate:remote` | Apply `migrations/` to production D1 |
| `npm run deploy` | Build and `wrangler deploy` |
| `npm run cf-typegen` | Regenerate Worker binding types |

Cron retention can be tried locally with:

```sh
curl "http://localhost:3000/cdn-cgi/local/scheduled?cron=15+3+*+*+*"
```

## How the site is hosted

One Worker serves the TanStack Start app and the API. Static assets are uploaded with the Worker by the Cloudflare Vite plugin. D1 is bound as `DB`. There is no Supabase, Firebase, or Lovable Cloud database.

| Path | Role |
| --- | --- |
| `POST /api/wishes` | Save a greeting and return `{ id, url }` |
| `GET /api/wishes/:id` | Public greeting for `/w/:id` |
| `POST /api/events` | Record a click, copy, open, or download |
| `GET /api/admin/stats?range=today\|7d\|30d\|all` | Private totals |
| `GET /api/config` | Public measurement id, Turnstile site key, retention |
| `/w/:id` | Personalized greeting |
| `/admin` | Private statistics |

The public site is [https://bestwishes.jasminshukla.com/](https://bestwishes.jasminshukla.com/). Share links look like `https://bestwishes.jasminshukla.com/w/abc123xy`. Opening one loads that sender, language, and design. It does not show the homepage’s default sender. The homepage itself still opens as Jasmin Shukla until a visitor enters their own name.

`royal-gold` is accepted and stored as the existing Royal Gold design (`royal`).

## What is counted

| You see in `/admin` | What happened |
| --- | --- |
| Share button clicks | Someone clicked the general share control |
| WhatsApp clicks | Someone clicked WhatsApp. The site cannot know if the message was sent |
| Links copied | The clipboard write succeeded |
| Greeting opens | Someone opened `/w/:id`. Repeats in the same browser session are not counted again |
| Downloads | An image download started |
| Visitors | Google Analytics 4 users, only when the Data API credentials are set |

Confirmed deliveries are not reported. WhatsApp and the device share sheet do not confirm them.

## Secrets

Set these with `npx wrangler secret put`, not in git:

- `TURNSTILE_SECRET_KEY`
- `ADMIN_API_TOKEN` (at least 16 characters)
- `RATE_LIMIT_SALT`
- `GA4_PRIVATE_KEY` (only if you want visitor totals inside `/admin`)

Public values live in `wrangler.jsonc` `vars` or `.dev.vars`: `GA_MEASUREMENT_ID`, `TURNSTILE_SITE_KEY`, `CF_BEACON_TOKEN`, `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `SITE_CONTACT_EMAIL`, `DATA_RETENTION_DAYS`.

`VITE_GA_MEASUREMENT_ID` and `VITE_TURNSTILE_SITE_KEY` are build-time fallbacks. A value set in Wrangler is used at runtime and does not require another build.

## Privacy and retention

`/privacy` explains what is stored. `DATA_RETENTION_DAYS` defaults to 365. A daily cron at 03:15 UTC deletes older wishes and events. Set it to `0` to keep rows. Set `SITE_CONTACT_EMAIL` to show a deletion contact on the privacy page.

Analytics cookies are not set until a visitor chooses Allow. Wish creation works either way.

## Security notes

Write APIs check the site origin, validate length and language, require a Turnstile token in production, and rate-limit repeated saves. Admin statistics require a Cloudflare Access JWT or the admin bearer token. If neither is configured, `/api/admin/stats` returns 503 and no numbers. Sender names are not included in analytics responses or Google Analytics events.

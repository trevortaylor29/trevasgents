# tonkasdungeon.com

Landing page for Trevs Agents. Single-page Next.js, deployed to Vercel.

## Local dev
```bash
npm install
npm run dev
# → http://localhost:3000
```

## Deploying

1. Push to GitHub
2. Connect repo to Vercel (free tier)
3. Vercel auto-detects Next.js — no config needed
4. Add custom domain `tonkasdungeon.com` via Vercel dashboard
5. Vercel offers domain registration in-flow OR point an external registrar's DNS at Vercel's nameservers

## What to update before launch

Open `src/app/page.tsx`, update the `LINKS` constant at the top:

- `guide` — already correct (existing $29 product)
- `bundle` — replace with the new $100 "guide + setup call" Gumroad URL
- `membership` — replace with the new $34.99/mo Inner Circle Gumroad URL
- `discord` — replace with a permanent Discord invite link (Server Settings → Invites → create one that never expires)
- `tiktok` — Trevor's AI-niche TikTok account URL
- `twitter` — Trevor's rebranded X / Twitter URL

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS 3.4
- Framer Motion 11

No backend. Pure static + client-side animations. All purchases route to Gumroad's hosted checkout.

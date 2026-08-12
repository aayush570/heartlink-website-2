# HeartLink Private Matchmaking

A dependency-free, multi-page website for HeartLink's private matchmaking practice for select Indian families.

## Content management

The site is configured for [Pages CMS](https://app.pagescms.org). Non-technical editors can update page copy, homepage sections, proof numbers, proof/media cards, stories, CTA labels and links, images, brand colours, navigation, footer links, contact details, service tiers, service-process text, careers copy, application text, partnership text, privacy copy, and FAQs.

Pages CMS configuration lives in `.pages.yml`. Editable content lives in `public/content`, and uploaded images are stored in `public/media`.

See [CMS-EDITING-GUIDE.md](./CMS-EDITING-GUIDE.md) for the owner workflow.

## Run locally

```bash
npm run dev
```

Open `http://localhost:4173`.

Before shipping any change, run:

```bash
npm run check
```

This validates content and links, checks SEO essentials, starts an isolated local server, and smoke-tests every live route, redirects, security headers, robots/sitemap output, 404 handling, and form validation.

## Production

```bash
PORT=4173 \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
RESEND_API_KEY=re_your_key \
HEARTLINK_NOTIFICATION_EMAIL=you@example.com \
HEARTLINK_FROM_EMAIL="HeartLink Website <website@your-verified-domain.com>" \
npm start
```

Vercel serves the pages and assets in `public/` directly from its CDN. Only `api/submissions.mjs` runs as a Vercel Function; this keeps page delivery independent from the form runtime and prevents a function failure from taking down the website. `scripts/local-server.mjs` remains the local and portable Node server. For a production setup:

1. Create a free Supabase project and run [`supabase-schema.sql`](./supabase-schema.sql) in its SQL editor.
2. Create a free Resend account and verify the sending domain.
3. Add the five environment variables above to Vercel for Production and Preview as appropriate.
4. Connect the production domain `heartlink.in` and make it the canonical domain.

Submissions are stored in the private Supabase `submissions` table and emailed through Resend. The service-role key is server-only and must never use a `NEXT_PUBLIC_` or other browser-exposed prefix.

`HEARTLINK_APPLICATION_WEBHOOK` remains supported as an optional alternative or additional delivery path.

The old `/methodology` and `/impact` URLs are permanent redirects to `/membership#process` and `/about#trust`. They are not separate CMS pages anymore.

`public/robots.txt` and `public/sitemap.xml` are production-ready static files. The local Node server generates equivalent responses during development.

## Launch checklist

- Confirm the approved brochure-led palette remains in use: soft white, lilac, brochure purple, rich plum, restrained gold and ink.
- Run `npm run check` before publishing.
- Remove any draft proof cards or unapproved testimonials before publishing.
- Configure Supabase and Resend environment variables in production.
- Submit test application, contact and partnership forms from the deployed domain.
- Check production logs for `heartlink_submission_delivery` events with successful storage and notification.
- Confirm `https://heartlink.in/robots.txt` and `https://heartlink.in/sitemap.xml` use the production domain after DNS is live.
- Have the launch privacy notice and service claims reviewed by the business owner and qualified Indian counsel before accepting real applicant data.

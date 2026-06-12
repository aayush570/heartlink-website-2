# HeartLink Private Advisory

A dependency-free, multi-page website for HeartLink's invite-only matchmaking and family advisory practice.

## Content management

The site is configured for [Pages CMS](https://app.pagescms.org). Non-technical editors can update page copy, repeatable sections, images, brand colours, navigation, contact details, roles, tiers, methodology steps, press cards, and FAQs.

Pages CMS configuration lives in `.pages.yml`. Editable content lives in `public/content`, and uploaded images are stored in `public/media`.

See [CMS-EDITING-GUIDE.md](./CMS-EDITING-GUIDE.md) for the owner workflow.

## Run locally

```bash
npm run dev
```

Open `http://localhost:4173`.

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

The server supports registry applications, general enquiries, and partnership enquiries. For a free production setup:

1. Create a free Supabase project and run [`supabase-schema.sql`](./supabase-schema.sql) in its SQL editor.
2. Create a free Resend account and verify the sending domain.
3. Add the five environment variables above to Vercel.

Submissions are stored in the private Supabase `submissions` table and emailed through Resend. The service-role key is server-only and must never use a `NEXT_PUBLIC_` or other browser-exposed prefix.

`HEARTLINK_APPLICATION_WEBHOOK` remains supported as an optional alternative or additional delivery path.

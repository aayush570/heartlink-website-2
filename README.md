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
PORT=4173 HEARTLINK_APPLICATION_WEBHOOK=https://your-secure-endpoint.example npm start
```

The server forwards validated application submissions to `HEARTLINK_APPLICATION_WEBHOOK`. In development, submissions are accepted without persistence so the flow can be tested safely. In production, the endpoint returns a temporary-unavailable response until a webhook is configured.

The webhook receives JSON containing the application fields, a private reference, and an ISO submission timestamp.

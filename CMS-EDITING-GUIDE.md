# HeartLink Website Editing Guide

You do not need to edit code to update the website.

## Connect Pages CMS

1. Make sure this updated project is pushed to the GitHub repository connected to Vercel.
2. Visit [app.pagescms.org](https://app.pagescms.org).
3. Sign in with the GitHub account that owns or can edit the repository.
4. Authorize Pages CMS for the HeartLink repository.
5. Select the repository and the `main` branch.

Pages CMS will automatically read `.pages.yml` from the root of the repository. The editor will show one entry for each live website page, plus one shared settings section:

- `Site Settings`
- `Home`
- `About`
- `Services`
- `Careers`
- `Application`
- `Contact`
- `Partnerships`
- `Privacy`

`Site Settings` controls shared items used across the whole website, such as the logo, colours, navigation, footer links, WhatsApp number, and contact emails. Keeping those in one place is simpler than repeating the same settings on every page.

The old standalone `Process` and `Trust & Recognition` pages now redirect into the live `Services` and `About` pages, so editors do not need to manage those separately anymore.

## Edit and publish

1. Open a section.
2. Change text, reorder cards, add items, remove items, or upload images.
3. Press **Save**.
4. Pages CMS commits the change to GitHub.
5. Vercel detects the commit and automatically deploys the updated website.

Vercel normally shows the new version within a few minutes. Its dashboard shows whether a deployment is building, ready, or failed.

## Images

Images uploaded through Pages CMS are saved in `public/media` and become part of the GitHub repository.

Recommended formats:

- Photos: `.avif` or high-quality `.jpg`
- Logos and transparent graphics: `.png`
- Keep individual images below 1.5 MB where possible
- Founder portraits: portrait orientation, ideally 1200 × 1600 pixels
- Impact feature image: landscape orientation, ideally 1800 × 1200 pixels
- Private profile carousel: portrait orientation; the website automatically blurs these images

Always complete the image description field. It helps accessibility and search engines.

## Brand colour rules

HeartLink uses a restrained private-advisory palette:

- Ivory / paper backgrounds: `#F8F4EC` and `#FDFBF6`
- Primary maroon: `#5F1724`
- Confidentiality green: `#183F32`
- Muted gold accent: `#B8954F`
- Ink text: `#29251F`

Keep the bright magenta and blue from the logo inside the logo itself. Do not use those colours for buttons, backgrounds, cards, headings or section themes unless the full brand system is intentionally redesigned.

## Proof and story rules

Do not publish placeholder proof, draft testimonials, invented quotes, or "coming soon" cards. If a proof item is not ready, remove it from the CMS until there is a real award, founder milestone, public recognition, anonymized example, image, source or approved story to show.

Anonymized stories should be specific enough to build trust but must not identify a family, candidate, employer, address, community detail or private circumstance without written approval.

## Headline highlights

Some main headlines contain pink italic words. In the CMS, these look like:

```text
Where two legacies <em>become one.</em>
```

Only place `<em>` before the highlighted words and `</em>` after them.

## What is intentionally protected

The CMS controls content, images, proof numbers, proof cards, stories, CTA labels and links, WhatsApp display text, contact details, navigation labels, footer links, lists, form intro text, application FAQs, and brand colours. The underlying spacing, animation, typography, responsiveness, form validation, and privacy behavior remain in code so an accidental edit cannot break the design.

## Important application-form note

Website applications and enquiries are stored in Supabase and emailed through Resend. Configure these server-only values in Vercel:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
HEARTLINK_NOTIFICATION_EMAIL
HEARTLINK_FROM_EMAIL
```

Run `supabase-schema.sql` once in the Supabase SQL editor before accepting production submissions. `HEARTLINK_APPLICATION_WEBHOOK` can still be added for Zapier, Make, a CRM, or another secure endpoint.

Before launch, submit one test application, one contact enquiry and one partnership enquiry from the deployed site. Confirm each record appears in Supabase, each email arrives through Resend, and the Vercel logs show `heartlink_submission_delivery` with `stored: true` and `notified: true`.

Never place private applicant data or any service-role/API key in Pages CMS, `public/content`, or another browser-visible file.

## Undo a mistake

Every Pages CMS save is a GitHub commit. To restore an earlier version:

1. Open the repository on GitHub.
2. Open the edited file under `public/content`.
3. Select **History**.
4. Open the last correct version and revert the unwanted commit.

Vercel will deploy the restored content automatically.

# HeartLink Website Editing Guide

You do not need to edit code to update the website.

## Connect Pages CMS

1. Make sure this updated project is pushed to the GitHub repository connected to Vercel.
2. Visit [app.pagescms.org](https://app.pagescms.org).
3. Sign in with the GitHub account that owns or can edit the repository.
4. Authorize Pages CMS for the HeartLink repository.
5. Select the repository and the `main` branch.

Pages CMS will automatically read `.pages.yml` from the root of the repository. The editor will show numbered sections:

- `00 · Global brand & contact`
- `01 · Home / The Vanguard`
- `02 · About the Curators`
- `03 · Methodology`
- `04 · Membership & Tiers`
- `05 · Impact & Press`
- `06 · Careers`
- `07 · Private Application`
- `08 · Privacy`

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

- Photos: `.webp` or high-quality `.jpg`
- Logos and transparent graphics: `.png`
- Keep individual images below 1.5 MB where possible
- Founder portraits: portrait orientation, ideally 1200 × 1600 pixels
- Impact feature image: landscape orientation, ideally 1800 × 1200 pixels
- Private profile carousel: portrait orientation; the website automatically blurs these images

Always complete the image description field. It helps accessibility and search engines.

## Headline highlights

Some main headlines contain pink italic words. In the CMS, these look like:

```text
Where two legacies <em>become one.</em>
```

Only place `<em>` before the highlighted words and `</em>` after them.

## What is intentionally protected

The CMS controls content, images, contact details, navigation labels, lists, and brand colours. The underlying spacing, animation, typography, responsiveness, form validation, and privacy behavior remain in code so an accidental edit cannot break the design.

## Important application-form note

Website applications are delivered to the URL configured in Vercel as:

```text
HEARTLINK_APPLICATION_WEBHOOK
```

This can point to Zapier, Make, a CRM, Airtable automation, or another secure endpoint. Do not place private applicant data in Pages CMS or a public content file.

## Undo a mistake

Every Pages CMS save is a GitHub commit. To restore an earlier version:

1. Open the repository on GitHub.
2. Open the edited file under `public/content`.
3. Select **History**.
4. Open the last correct version and revert the unwanted commit.

Vercel will deploy the restored content automatically.

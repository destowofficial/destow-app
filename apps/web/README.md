# @destow/web

The Destow marketing site — a pre-launch **Coming Soon / Early Access** landing
page. Not the booking product; it collects early-access signups only.

## Stack

- **Next.js 14** (App Router) + **React 18**
- **Tailwind CSS 3.4** with **shadcn/ui** primitives (`src/components/ui`)
- **lucide-react** icons
- Type-safe, statically prerendered (`next build` → one static route)

## Develop

```bash
bun install          # from the repo root (Bun workspace)
bun run --cwd apps/web dev     # http://localhost:3200
bun run --cwd apps/web build   # production build
```

## Structure

```
src/
  app/
    layout.tsx      # fonts, metadata
    page.tsx        # composes the sections
    globals.css     # tokens + brand utilities
  components/
    ui/             # shadcn primitives: button, input, card
    site/           # header, hero, waitlist, vision, coming-soon,
                    # timeline, newsletter, footer, highway (hero SVG)
  lib/utils.ts      # cn()
public/
  destow-logo.png       # full logo
  destow-wordmark.png   # cropped transparent wordmark (nav/footer)
```

## Brand tokens

Sampled from the Destow logo, defined in `tailwind.config.ts` and
`globals.css`:

- `brand` `#0B52F5` (logo blue), `navy` `#1C2331` (logo ink)
- White background, light-blue gradients, soft-gray sections

## Not yet wired

The email forms validate and show a success state but do **not** POST anywhere.
Point `EmailForm` (`src/components/site/email-form.tsx`) at a real endpoint
(e.g. `POST /api/v1/waitlist`) when the API's waitlist route ships.

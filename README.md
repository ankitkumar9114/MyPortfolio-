# Portfolio

An Awwwards-style personal portfolio: Next.js (App Router) + TypeScript +
Tailwind CSS v4, animated with GSAP/ScrollTrigger, Lenis smooth scroll, and
Framer Motion.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** (CSS-first config, see `src/app/globals.css`)
- **GSAP + ScrollTrigger** — scroll-driven reveals, marquee, custom cursor, magnetic buttons
- **Lenis** — smooth scroll, synced to GSAP's ticker (`src/components/providers/SmoothScroll.tsx`)
- **Framer Motion** — mobile nav transition, cursor-follow project preview

All animated components respect `prefers-reduced-motion`.

## Getting started

```bash
npm run dev         # start the dev server at localhost:3000
npm run build       # production build
npm run lint        # eslint
npm run images:webp # convert raw-images/ -> public/images/*.webp
```

## Project structure

```
src/
  app/                    # routes, layout, global styles
  components/
    layout/Navbar.tsx      # fixed nav + mobile menu (Framer Motion)
    providers/SmoothScroll.tsx
    sections/               # Hero, About, Work, Contact
    ui/
      CustomCursor.tsx      # magnetic dot+ring cursor (desktop only)
      Magnetic.tsx          # wraps any element to make it "magnetic"
      Preloader.tsx         # animated intro counter + curtain wipe
      Reveal.tsx            # reusable scroll-triggered fade/slide-up
  data/projects.ts          # your project list — edit this first
  lib/gsap.ts                # gsap + ScrollTrigger registration
raw-images/                  # drop original photos/screenshots here
public/images/                # `npm run images:webp` output — reference these in components
scripts/convert-images.mjs    # the conversion script (sharp)
```

## Image pipeline

Drop any `.png`/`.jpg`/`.jpeg`/`.tiff`/`.gif`/`.avif` into `raw-images/`
(subfolders are fine — `raw-images/nova-studio/cover.jpg` becomes
`public/images/nova-studio/cover.webp`), then run:

```bash
npm run images:webp                    # quality 82 by default
npm run images:webp -- --quality=90    # override quality
```

Re-running only converts new/changed files — see `raw-images/README.md`.

## Making it yours

1. **Content** — replace the placeholder name, bio, and copy in
   `Navbar.tsx`, `Hero.tsx`, `About.tsx`, and `Contact.tsx`.
2. **Projects** — edit `src/data/projects.ts`. Each entry currently uses a
   CSS gradient as its preview card; once you have real case-study images,
   drop them in `raw-images/`, run `npm run images:webp`, and reference the
   resulting `public/images/...webp` path in `Work.tsx`.
3. **Colors/fonts** — CSS variables live at the top of
   `src/app/globals.css` (`--background`, `--foreground`, `--accent`, …).
   Fonts are set up in `src/app/layout.tsx` via `next/font/google`
   (Bricolage Grotesque for display type, Inter for body copy) — swap
   either for any other Google font by changing the import.
4. **Cursor/animations** — any element can opt into the custom cursor's
   hover state with `data-cursor="hover"`, or hide it with
   `data-cursor="hide"`.

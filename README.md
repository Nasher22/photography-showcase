# PhotoVoyage

Static photography showcase site. Plain HTML, CSS and JavaScript — no framework,
no bundler, no `node_modules`, no build step.

## Running it

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000>. You can also just double-click `index.html`;
everything is relative and there are no `fetch` calls that require a server
(the form falls back to a simulated mode until an endpoint is configured).

VS Code users: `.vscode/launch.json` is already pointed at `http://localhost:8000`.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home — hero, about, animated stats, testimonials, contact form |
| `gallery.html` | Filterable, searchable gallery with a lightbox |
| `services.html` | Pricing packages + booking request form |
| `about.html` | About the studio, process, stats |
| `contact.html` | Contact details + enquiry form |

## Before you launch — required changes

1. **Domain.** Every canonical / Open Graph URL uses `https://photovoyage.example`.
   `.example` is reserved and can never be registered, so it is a safe
   placeholder. Replace it with your real domain in the five HTML files,
   `sitemap.xml` and `robots.txt`.
2. **Contact form endpoint.** Open `script.js` and set:
   ```js
   const FORM_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID';
   ```
   While it is empty the forms validate and show a simulated success toast, and
   nothing is sent. Once set, submissions POST to Formspree (or Web3Forms, or
   any endpoint that accepts `FormData`).
3. **Prices.** `services.html` ships with placeholder rates. Replace them.
4. **Testimonials.** Three placeholder quotes in `index.html`. Replace with real
   client quotes and names.
5. **Social links.** `index.html` / `services.html` / footer blocks point at bare
   `instagram.com` and `facebook.com`. Put your real profile URLs in.
6. **Images.** See "Gallery content is placeholder" below — all nine gallery
   photos must be replaced with the studio's own work before launch.

## Image quality

The responsive `<picture>` pipeline is in place and never upscales, so it
reproduces whatever resolution the source gives it.

| File | Size | Verdict |
|---|---|---|
| `assets/images/55fe0f70-…jpg` (hero) | 1080×805 | Too small for a full-bleed hero on wide screens — replace with ≥1920px |
| `img1.jpg` | 1920×1280 | Fine |
| `img2.jpg` | 1500×1500 | Fine |
| `img3.jpg` | 2602×1960 | Fine |
| `img4.jpg` – `img9.jpg` | 1600×1200 | Fine (see `assets/images/CREDITS.md`) |

The hero is the one real remaining gap. Replace the source file and re-run
`python tools\build-images.py`.

## Gallery content is placeholder

`img4` – `img9` are stock photographs (Unsplash License) standing in for the
studio's own work, and `img1` – `img3` have unknown provenance. **All nine must
be replaced before launch** — showing stock photos as your own portfolio is
misleading to clients. Full source list in `assets/images/CREDITS.md`.

## Optional tooling

`tools/sync-layout.mjs` keeps the header and footer identical across all five
pages. It is a developer convenience, not a build step — the site works without
it, and you can delete the `tools/` folder entirely.

```powershell
node tools\sync-layout.mjs            # copy nav + footer from index.html to all pages
node tools\sync-layout.mjs --check    # report drift, change nothing
node tools\sync-layout.mjs --source=gallery.html
```

Each page delimits its shared regions with `<!-- #nav -->` / `<!-- /#nav -->`
and `<!-- #footer -->` / `<!-- /#footer -->`. Edit inside those markers and
re-run the tool. It re-applies each page's own `class="active"` /
`aria-current="page"` automatically.

## Service worker

`sw.js` caches pages and assets for offline viewing. It only works over HTTPS
(or `localhost`). **During local development it can serve stale files** — if you
see old content, either hard-reload with cache bypass, or temporarily comment
out the `navigator.serviceWorker.register('sw.js')` call in `script.js` and bump
`CACHE_VERSION` in `sw.js` when you deploy.

## Accessibility

Handled: skip link, semantic landmarks, real `<button>` elements for the menu,
filters, gallery tiles and lightbox controls, `aria-expanded` / `aria-pressed` /
`aria-modal`, a focus trap in the lightbox, focus restoration on close, visible
`:focus-visible` outlines, labelled form fields with inline errors announced via
`aria-live`, and a full `prefers-reduced-motion` path.

Known gaps: add `alt` text to any images you add, and re-check the placeholder
testimonials are replaced with real content.

## Deploying

Upload the repository root to any static host (GitHub Pages, Netlify, Cloudflare
Pages, Vercel). No server-side anything is required.

Remember to update the domain in step 1 and configure `FORM_ENDPOINT` in step 2.
# Image credits

**Every photograph in this repository is a placeholder.** On a real photography
site, presenting stock images as the studio's own work is misleading — replace
all of them before launch (see "Before you launch" in the root `README.md`).

## Current sources

`img1.jpg` – `img3.jpg`, the hero (`55fe0f70-…jpg`) and the unused
`840535af-…jpg` were supplied with the original project and have **unknown
provenance**. Confirm you hold the rights, or replace them.

`img4.jpg` – `img9.jpg` were fetched from [Lorem Picsum](https://picsum.photos),
which serves photographs published on Unsplash under the
[Unsplash License](https://unsplash.com/license) — free for commercial use, no
permission needed. A light contrast/saturation grade was applied so the set reads
as one portfolio rather than assorted stock.

| File | Photographer | Native size | Source |
|---|---|---|---|
| `img4.jpg` | Alexander Shustov | 4326×2884 | <https://unsplash.com/photos/AHBiSKaENwc> |
| `img5.jpg` | Johnny Lam | 1280×848 | <https://unsplash.com/photos/63qfL0TciY8> |
| `img6.jpg` | Daniel Genser | 2000×1333 | <https://unsplash.com/photos/PzPbh-faPgU> |
| `img7.jpg` | Jon Eckert | 5000×3333 | <https://unsplash.com/photos/umLpP7uCZs0> |
| `img8.jpg` | Alex | 3264×2448 | <https://unsplash.com/photos/zMz14hsbpuU> |
| `img9.jpg` | Dorothy Lin | 3011×2000 | <https://unsplash.com/photos/OokBLPrkCNk> |

> **Note on `img5.jpg`** — it was requested at 1600×1200 but its native
> resolution is only 1280×848, so it was upscaled by roughly 125% by the source
> service. It still looks acceptable at web sizes and in the lightbox, but it is
> the weakest file in the set. Replace it if you have a better bridge/night shot.

Unsplash License summary: free to use commercially and non-commercially, no
permission needed; compiling the photos into a website is permitted. The licence
does **not** permit selling unmodified copies, or implying endorsement of a
product.

Attribution is not required by the licence but is appreciated. If any of these
photos are kept, leaving the credits above is the courteous default.

## Derived files

`assets/img/*.webp` and `assets/images/og-cover.jpg` are generated derivatives,
never upscaled. Regenerate with:

```powershell
python tools\build-images.py
```
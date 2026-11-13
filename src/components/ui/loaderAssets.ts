// What a full-screen loader waits for: every image the first screens of the
// page use on this screen size, loaded and decoded up front. Shared by the
// loader (MughalLoader).

// Loads AND decodes an image, so it's ready to paint the instant it scrolls
// into view (decoding a big image mid-scroll is what causes jank).
export function prepareImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      img.decode().then(resolve, resolve);
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

// Every image the page uses for THIS screen size: <img> elements that are
// rendered (an element under display:none reports no client rects, so the
// other breakpoints' variants are skipped), plus CSS background images.
// Lazy <img>s are switched to eager, so they load now instead of mid-scroll.
// What the loader waits for: only what the first screens show, i.e. the
// navigation and page background (outside <main>), the hero and the case
// studies (the sections of <main> up to and including #work). Everything
// further down (impact cards, TV, LinkedIn posts, shelf, footer) loads as the
// visitor scrolls towards it (lazy images, posts loaded when near).
function isPriority(el: Element) {
  const main = document.querySelector("main");
  if (!main || !main.contains(el)) return true;
  const work = document.getElementById("work");
  for (const section of Array.from(main.children)) {
    if (section.contains(el)) return true;
    if (work && section.contains(work)) return false;
  }
  return false;
}
export function collectImageUrls(): string[] {
  const urls = new Set<string>();
  for (const img of Array.from(document.images)) {
    if (img.getClientRects().length === 0 || !isPriority(img)) continue;
    if (img.loading === "lazy") img.loading = "eager";
    const src = img.currentSrc || img.src;
    if (src) urls.add(src);
  }
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("body, body *"))) {
    if (!isPriority(el)) continue;
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none") continue;
    for (const m of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      if (!m[1].startsWith("data:")) urls.add(new URL(m[1], location.href).href);
    }
  }
  // the phone wall texture is drawn by body::before
  const before = getComputedStyle(document.body, "::before").backgroundImage;
  for (const m of before.matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.add(new URL(m[1], location.href).href);
  return [...urls];
}

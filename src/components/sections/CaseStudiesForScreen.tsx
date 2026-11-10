"use client";

import { useSyncExternalStore } from "react";
import CaseStudyCarousel from "./CaseStudyCarousel";
import PhoneCaseStudyStack from "./PhoneCaseStudyStack";
import TabletCaseStudyStack from "./TabletCaseStudyStack";

// Renders only the case-study layout for this screen size. All three used
// to be built on every device and hidden with CSS, so phones carried the
// desktop carousel too: it cuts every card into 320 slices, each a full copy
// of the card (~6,600 elements), which a phone had to build, hydrate and keep
// in memory for nothing. The server sends the light phone list (every case
// study's text is in it); tablets and desktops switch to their own layout as
// soon as the page starts, while the loader still covers the screen.
const DESKTOP_MQ = "(min-width: 1025px)";
const TABLET_MQ = "(min-width: 425px)";

function subscribe(cb: () => void) {
  const mqs = [window.matchMedia(DESKTOP_MQ), window.matchMedia(TABLET_MQ)];
  mqs.forEach((m) => m.addEventListener("change", cb));
  return () => mqs.forEach((m) => m.removeEventListener("change", cb));
}
const getScreen = () => (window.matchMedia(DESKTOP_MQ).matches ? "desktop" : window.matchMedia(TABLET_MQ).matches ? "tablet" : "phone");

export default function CaseStudiesForScreen() {
  const screen = useSyncExternalStore(subscribe, getScreen, () => "phone" as const);
  if (screen === "desktop") return <CaseStudyCarousel />;
  if (screen === "tablet") return <TabletCaseStudyStack />;
  return <PhoneCaseStudyStack />;
}

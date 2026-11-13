// The loader's events, in order. MughalFrame fires them (each once per
// loader); anything can listen with onLoaderEvent. They're also window
// events named "loader:<event>", with the time they fired
// (performance.now()) as `detail.at`.
//
//   loaderStarted             the loader is on screen
//   energyOrbActivated        the golden orb is showing (golden ending)
//   charactersApproaching     the characters start flying in
//   energyBuilding            they're close: the orb charges up
//   charactersTouched         their fingertips touch (the source of truth)
//   goldenExplosionTriggered  the orb releases its energy (golden ending)
//   websiteRevealTriggered    the site starts to show (golden: touch + 0.36 s)
//   loaderCompleted           the loader is gone

export type LoaderEvent =
  | "loaderStarted"
  | "energyOrbActivated"
  | "charactersApproaching"
  | "energyBuilding"
  | "charactersTouched"
  | "goldenExplosionTriggered"
  | "websiteRevealTriggered"
  | "loaderCompleted";

// one loader's events: each fires at most once
export function createLoaderEvents(enabled = true) {
  const fired = new Map<LoaderEvent, number>();
  return {
    emit(name: LoaderEvent) {
      if (!enabled || fired.has(name)) return;
      const at = performance.now();
      fired.set(name, at);
      window.dispatchEvent(new CustomEvent(`loader:${name}`, { detail: { at } }));
    },
    at: (name: LoaderEvent) => fired.get(name),
  };
}

export function onLoaderEvent(name: LoaderEvent, cb: (at: number) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<{ at: number }>).detail.at);
  window.addEventListener(`loader:${name}`, handler);
  return () => window.removeEventListener(`loader:${name}`, handler);
}

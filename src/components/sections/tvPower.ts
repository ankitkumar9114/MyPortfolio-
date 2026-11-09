"use client";

import { createContext, useContext } from "react";

// The TV's remote: state plus actions, owned by TvOnCabinet (which draws the
// screen, via useTvState in TvScreen.tsx) and used by the front-panel
// buttons in TvControls. Every action other than power is ignored while the
// TV is off, like a real set.
export type TvRemote = {
  on: boolean;
  // Bumps each time something other than a click (the scroll) switches the
  // set on/off, so the power button can play its press animation.
  autoPress: number;
  toggle: () => void;
  prev: () => void;
  next: () => void;
  playPause: () => void;
  volUp: () => void;
  volDown: () => void;
};

const noop = () => {};

export const TvPowerContext = createContext<TvRemote>({
  on: false,
  autoPress: 0,
  toggle: noop,
  prev: noop,
  next: noop,
  playPause: noop,
  volUp: noop,
  volDown: noop,
});

export function useTvPower() {
  return useContext(TvPowerContext);
}

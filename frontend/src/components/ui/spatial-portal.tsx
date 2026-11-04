"use client";

import { createContext } from "react";

/** Keep dialogs and menus inside a world-space screen when one is active. */
export const SpatialPortalContext = createContext<HTMLElement | null>(null);

/** Opt-in presentation: ordinary 2D pages retain their existing dialog style. */
export const SpatialStoreContext = createContext(false);

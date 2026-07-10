/**
 * Version stamps (CTO update v2, 0.4): the footer, the printed one-pager and
 * every exported scenario carry the app commit, the calculation-engine
 * version and the data version — so any output can be traced back to the
 * exact code and data that produced it.
 */
import { DATA_VERSION } from "./data";

/** Bump on any change to the calculation engine's maths or thresholds. */
export const ENGINE_VERSION = "2.0.0";

/** Short git commit hash, baked at build time by next.config.mjs ("dev" outside a build). */
export const APP_COMMIT = process.env.NEXT_PUBLIC_GIT_SHA ?? "dev";

export { DATA_VERSION };

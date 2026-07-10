/**
 * Static export config. The prototype ships as fully static HTML/JS to GitHub
 * Pages (and is trivially re-targetable to a custom subdomain at root).
 *
 *  - `output: 'export'`  → emits ./out as a static site (no Node server).
 *  - `trailingSlash`     → each route becomes a directory + index.html, which
 *                          Pages serves cleanly (/register/ , /register/UC-01/).
 *  - `basePath`          → '' for a root deploy (custom subdomain); set to the
 *                          repo name for a github.io project-path deploy. Driven
 *                          by env so the subdomain cutover is a one-line change.
 *  - images.unoptimized  → required; the Next image optimizer needs a server.
 */
import { execSync } from "node:child_process";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Bake the commit hash into the bundle (update v2, 0.4): the footer and every
 *  exported scenario carry the exact commit the build came from. */
function gitSha() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_GIT_SHA: process.env.NEXT_PUBLIC_GIT_SHA || gitSha(),
  },
};

export default nextConfig;

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
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;

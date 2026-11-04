import type { APIRoute } from "astro";

/** Point crawlers at the sitemap generated for the configured production origin. */
export const GET: APIRoute = ({ site }) => new Response(
  `User-agent: *\nAllow: /\n\nSitemap: ${new URL("/sitemap-index.xml", site)}\n`,
  { headers: { "Content-Type": "text/plain; charset=utf-8" } },
);

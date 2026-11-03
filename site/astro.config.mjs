import { defineConfig } from "astro/config";

export default defineConfig({
  markdown: {
    shikiConfig: { theme: "github-dark-dimmed" },
  },
  site:
    process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:4321"),
});

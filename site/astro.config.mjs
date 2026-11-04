import tailwindcss from "@tailwindcss/vite";
import expressiveCode from "astro-expressive-code";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    expressiveCode({
      themes: ["github-dark-dimmed"],
      styleOverrides: {
        borderRadius: "14px",
        borderWidth: "1px",
        borderColor: "var(--line)",
        codeBackground: "var(--card)",
        codeFontFamily: '"Geist Mono", ui-monospace, monospace',
        codeFontSize: "0.8125rem",
        uiFontFamily: '"Geist", system-ui, sans-serif',
        frames: {
          editorBackground: "var(--card)",
          terminalBackground: "var(--card)",
          frameBoxShadowCssValue: "none",
        },
      },
    }),
  ],
  site:
    process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://astro-dither.vercel.app"),

	vite: {
		plugins: [tailwindcss()],
	},
});

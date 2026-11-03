import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { EFFECTS } from "../docs/registry";
import { COMPONENT_DOCS } from "../docs/components";

export const GET: APIRoute = async () => {
  const entries = await getCollection("docs");
  const base = "https://astro-dither.vercel.app";
  const guide = (id: string) => entries.find((e) => e.id === id);
  const line = (title: string, href: string, desc: string) => `- [${title}](${base}${href}.md): ${desc}`;

  const guideIds = ["index", "installation", "copy-the-source", "theming"];
  const engineIds = ["engine/how-it-works", "engine/matrices", "engine/performance", "engine/accessibility", "engine/write-your-own"];

  const sections = [
    `# astro-dither

> Animated dither backgrounds, gradients and image effects for Astro. No React. Each component serialises its settings into a data attribute, and a small custom element mounts a shared WebGL2 context that draws each effect's GLSL field through a Bayer threshold into your palette. Markdown mirrors of every docs page are below.`,
    `## Get started

${guideIds.map((id) => line(guide(id)!.data.title, id === "index" ? "/docs" : `/docs/${id}`, guide(id)!.data.description)).join("\n")}`,
    `## Components

${COMPONENT_DOCS.map((c) => line(c.title, `/docs/components/${c.slug}`, c.description)).join("\n")}`,
    `## Effects

${line("Catalog", "/docs/effects", "All 18 effects, live, grouped by family.")}
${EFFECTS.map((e) => line(e.title, `/docs/effects/${e.slug}`, e.description)).join("\n")}`,
    `## Engine

${engineIds.map((id) => line(guide(id)!.data.title, `/docs/${id}`, guide(id)!.data.description)).join("\n")}`,
  ];
  return new Response(sections.join("\n\n") + "\n", { headers: { "Content-Type": "text/plain" } });
};

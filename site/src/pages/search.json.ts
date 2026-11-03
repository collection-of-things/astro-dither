import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { EFFECTS } from "../docs/registry";
import { NAV } from "../docs/nav";

export const GET: APIRoute = async () => {
  const entries = await getCollection("docs");
  const componentItems = NAV.find((s) => s.title === "Components")?.items ?? [];
  const items = [
    ...entries.map((e) => ({
      title: e.data.title,
      section: e.data.section,
      desc: e.data.description,
      href: e.id === "index" ? "/docs" : `/docs/${e.id}`,
    })),
    { title: "Catalog", section: "Effects", desc: "All 18 effects, live.", href: "/docs/effects" },
    ...EFFECTS.map((e) => ({
      title: e.title,
      section: `Effects, ${e.group}`,
      desc: e.description,
      href: `/docs/effects/${e.slug}`,
    })),
    ...componentItems.map((i) => ({
      title: i.title,
      section: "Components",
      desc: `${i.title} component documentation.`,
      href: i.href,
    })),
    { title: "Examples", section: "Site", desc: "Every component and effect, live.", href: "/examples" },
  ];
  return new Response(JSON.stringify(items), { headers: { "Content-Type": "application/json" } });
};

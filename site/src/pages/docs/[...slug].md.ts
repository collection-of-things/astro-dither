import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection, getEntry } from "astro:content";
import { EFFECTS } from "../../docs/registry";
import { componentMarkdown, effectMarkdown } from "../../docs/markdown";
import { COMPONENT_DOCS } from "../../docs/components";

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection("docs");
  const paths = entries
    .filter((e) => e.id !== "index")
    .map((e) => ({ params: { slug: e.id }, props: { kind: "guide", id: e.id } }));
  paths.push({ params: { slug: "effects" }, props: { kind: "catalog", id: "effects" } });
  for (const e of EFFECTS) {
    paths.push({ params: { slug: `effects/${e.slug}` }, props: { kind: "effect", id: e.slug } });
  }
  for (const c of COMPONENT_DOCS) {
    paths.push({ params: { slug: `components/${c.slug}` }, props: { kind: "component", id: c.slug } });
  }
  return paths;
};

export const GET: APIRoute = async ({ props }) => {
  const { kind, id } = props as { kind: string; id: string };
  let body = "";
  if (kind === "guide") {
    body = (await getEntry("docs", id))?.body ?? "";
  } else if (kind === "effect") {
    const doc = EFFECTS.find((e) => e.slug === id);
    body = doc ? effectMarkdown(doc) : "";
  } else if (kind === "component") {
    const doc = COMPONENT_DOCS.find((c) => c.slug === id);
    body = doc ? componentMarkdown(doc.title, doc.description, doc.usage, doc.intro, doc.rows) : "";
  } else {
    body = `# Effect catalog\n\nAll 19 effects, live. Browse them at /docs/effects.\n`;
  }
  return new Response(body, { headers: { "Content-Type": "text/markdown" } });
};

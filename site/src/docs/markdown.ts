import { effects } from "astro-dither/effects";
import { effectParamRows, SHARED_PROP_ROWS } from "./registry";
import { usageImport } from "./format";
import type { EffectDoc, PropRow } from "./registry";

function propsTable(rows: PropRow[]): string {
  const body = rows.map((r) => `| \`${r.name}\` | \`${r.type}\` | ${r.def} | ${r.desc} |`).join("\n");
  return `| Prop | Type | Default | Description |\n| --- | --- | --- | --- |\n${body}`;
}

export function effectMarkdown(doc: EffectDoc): string {
  const def = effects[doc.slug];
  const exampleBlocks = doc.examples
    .map(
      (ex) => {
        const props: string[] = [`effect="${doc.slug}"`];
        if (ex.params) props.push(`params={${JSON.stringify(ex.params)}}`);
        if (ex.palette) props.push(`palette={${JSON.stringify(ex.palette)}}`);
        if (ex.cell !== undefined) props.push(`cell={${ex.cell}}`);
        if (ex.matrix !== undefined) props.push(`matrix={${JSON.stringify(ex.matrix)}}`);
        if (ex.speed !== undefined) props.push(`speed={${ex.speed}}`);
        return `### ${ex.title}\n\n${ex.sentence}\n\n\`\`\`astro\n<DitherEffect ${props.join(" ")} />\n\`\`\``;
      },
    )
    .join("\n\n");
  return `# ${doc.title}

${doc.description}

## Installation

\`\`\`sh
pnpm add astro-dither
\`\`\`

Or copy the source into your project:

\`\`\`sh
npx astro-dither add effect
\`\`\`

## Usage

\`\`\`astro
---
import { ${usageImport(doc.usage)} } from "astro-dither";
---

${doc.usage}
\`\`\`

${doc.intro}

The props group like this:

${doc.propGroups}

## Examples

${exampleBlocks}

## Props

${propsTable([...effectParamRows(doc.slug), ...SHARED_PROP_ROWS])}

## Notes

* Decorative and \`aria-hidden\`. Put real text on top, not inside it.
* With reduced motion it draws one still frame (at ${def.stillTime}s) and stops.
* It pauses when scrolled out of view or when the tab is hidden.
* Shares one WebGL context with every other ordered effect on the page.
`;
}

export function componentMarkdown(
  title: string,
  description: string,
  usage: string,
  intro: string,
  rows: PropRow[],
): string {
  return `# ${title}

${description}

## Installation

\`\`\`sh
pnpm add astro-dither
\`\`\`

Or copy the source into your project:

\`\`\`sh
npx astro-dither add ${title.replace("Dither", "").toLowerCase() || "dither"}
\`\`\`

## Usage

\`\`\`astro
---
import { ${title} } from "astro-dither";
---

${usage}
\`\`\`

${intro}

## Props

${propsTable(rows)}

## Notes

* Decorative surfaces are \`aria-hidden\`. Put real text on top, not inside them.
* With reduced motion it draws one still frame and stops.
* It pauses when scrolled out of view or when the tab is hidden.
`;
}

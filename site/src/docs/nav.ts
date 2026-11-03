import { EFFECTS, EFFECT_GROUP_ORDER } from "./registry";

export interface NavItem {
  title: string;
  href: string;
  md?: string;
}

export interface NavSection {
  title: string;
  collapsible?: boolean;
  count?: number;
  items: NavItem[];
}

const effectItems: NavItem[] = [{ title: "Catalog", href: "/docs/effects", md: "/docs/effects.md" }];
for (const group of EFFECT_GROUP_ORDER) {
  for (const e of EFFECTS.filter((e) => e.group === group)) {
    effectItems.push({ title: e.title, href: `/docs/effects/${e.slug}`, md: `/docs/effects/${e.slug}.md` });
  }
}

export const NAV: NavSection[] = [
  {
    title: "Get started",
    items: [
      { title: "Introduction", href: "/docs", md: "/docs.md" },
      { title: "Installation", href: "/docs/installation", md: "/docs/installation.md" },
      { title: "Copy the source", href: "/docs/copy-the-source", md: "/docs/copy-the-source.md" },
      { title: "Theming and palettes", href: "/docs/theming", md: "/docs/theming.md" },
    ],
  },
  {
    title: "Components",
    items: [
      { title: "Dither", href: "/docs/components/dither", md: "/docs/components/dither.md" },
      { title: "DitherImage", href: "/docs/components/dither-image", md: "/docs/components/dither-image.md" },
      { title: "DitherGradient", href: "/docs/components/dither-gradient", md: "/docs/components/dither-gradient.md" },
      { title: "DitherAurora", href: "/docs/components/dither-aurora", md: "/docs/components/dither-aurora.md" },
      { title: "DitherEffect", href: "/docs/components/dither-effect", md: "/docs/components/dither-effect.md" },
      { title: "DitherGlobe", href: "/docs/components/dither-globe", md: "/docs/components/dither-globe.md" },
    ],
  },
  {
    title: "Effects",
    collapsible: true,
    count: 18,
    items: effectItems,
  },
  {
    title: "Engine",
    items: [
      { title: "How it works", href: "/docs/engine/how-it-works", md: "/docs/engine/how-it-works.md" },
      { title: "Matrices and cells", href: "/docs/engine/matrices", md: "/docs/engine/matrices.md" },
      { title: "Performance", href: "/docs/engine/performance", md: "/docs/engine/performance.md" },
      { title: "Accessibility", href: "/docs/engine/accessibility", md: "/docs/engine/accessibility.md" },
      { title: "Write your own effect", href: "/docs/engine/write-your-own", md: "/docs/engine/write-your-own.md" },
    ],
  },
];

export const FLAT_ITEMS: NavItem[] = NAV.flatMap((s) => s.items);

export function neighbours(href: string): { prev?: NavItem; next?: NavItem } {
  const i = FLAT_ITEMS.findIndex((it) => it.href === href);
  return { prev: i > 0 ? FLAT_ITEMS[i - 1] : undefined, next: i >= 0 && i < FLAT_ITEMS.length - 1 ? FLAT_ITEMS[i + 1] : undefined };
}

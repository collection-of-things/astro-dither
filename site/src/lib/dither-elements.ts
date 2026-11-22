/** Update the host's dither element in place when the tag matches, so sliders do not restart the motion. */
export function update(host: Element | null, tag: string, data: Record<string, unknown>, innerHTML = ""): Element | undefined {
  const current = host?.querySelector(`:scope > ${tag}`);
  if (!current) return remount(host, tag, data, innerHTML);
  current.setAttribute("data-dither", JSON.stringify(data));
  return current;
}

/** Rebuild a dither element so it remounts with new settings and restarts its clock. */
export function remount(host: Element | null, tag: string, data: Record<string, unknown>, innerHTML = ""): Element | undefined {
  if (!(host instanceof HTMLElement)) return undefined;
  const el = document.createElement(tag);
  el.setAttribute("data-dither", JSON.stringify(data));
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = "display:block;width:100%;height:100%";
  el.innerHTML = innerHTML;
  host.replaceChildren(el);
  return el;
}

/** Create a live `<dither-surface>` for an ordered effect. */
export function mountSurface(host: Element | null, data: Record<string, unknown>): Element | undefined {
  return remount(host, "dither-surface", data);
}

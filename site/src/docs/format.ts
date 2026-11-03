/** Escape HTML, then turn `code` spans into <code> for registry prose. */
export function inline(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** The component an effect's usage snippet imports, derived from the markup. */
export function usageImport(usage: string): string {
  return usage.match(/<(\w+)/)?.[1] ?? "DitherEffect";
}

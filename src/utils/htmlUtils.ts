/** Strip HTML tags, replacing block-level elements with newlines. */
export function stripHtml(html: string): string {
  return html
    .replace(/<\/?(p|div|br|li|tr|h[1-6]|blockquote)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

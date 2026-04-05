/** iframe src에서 YouTube/Vimeo watch URL → embed URL로 변환 */
export function fixEmbedUrls(html: string): string {
  return html.replace(
    /<iframe([^>]*)\ssrc="([^"]*)"([^>]*)>/gi,
    (_match, before, src, after) => {
      let fixed = src;
      const yt = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]+)/);
      if (yt) fixed = `https://www.youtube.com/embed/${yt[1]}`;
      const vim = src.match(/vimeo\.com\/(\d+)/);
      if (vim) fixed = `https://player.vimeo.com/video/${vim[1]}`;
      return `<iframe${before} src="${fixed}"${after}>`;
    },
  );
}

/** Strip HTML tags, replacing block-level elements with newlines. */
export function stripHtml(html: string): string {
  return html
    .replace(/<\/?(p|div|br|li|tr|h[1-6]|blockquote)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

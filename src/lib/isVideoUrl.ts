const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;

/** URL 확장자로 video 여부 판별. blob/data URL 은 false (확실치 않으므로 보수적). */
export function isVideoUrl(url: string): boolean {
  return VIDEO_EXT.test(url);
}

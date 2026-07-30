/** 미리보기 핸드오프용 sessionStorage 키 — writer(editor)/reader(preview) 공유.
 *  bare 문자열로 흩어지면 한쪽 오타 시 핸드오프가 무음으로 깨지므로 단일 소스로 고정한다. */
export const PREVIEW_KEY = {
  post: "post-preview",
  work: "work-preview",
} as const;

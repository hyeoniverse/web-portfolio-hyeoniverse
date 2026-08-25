/**
 * 저자 프로필의 링크에서 GitHub 사용자명을 뽑는다.
 *
 * 사용자명을 따로 저장하지 않고 링크에서 파생시킨다 — 링크와 표시가 어긋날 일이 없고,
 * 저장할 필드도 늘지 않는다. 서버(프로필 자동 생성)와 화면(@아이디 표시)이 같이 쓴다.
 */
export function githubLoginFromLinks(
  links: readonly { platform: string; url: string }[] | undefined,
): string {
  const gh = (links ?? []).find((l) => l.platform === "github");
  if (!gh?.url) return "";
  const m = gh.url.match(/github\.com\/([^/?#]+)/i);
  return m ? m[1] : "";
}

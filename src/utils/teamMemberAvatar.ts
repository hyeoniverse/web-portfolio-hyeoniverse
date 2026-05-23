/** SNS / 프로필 URL 을 unavatar.io 호환 (service, username) 쌍으로 파싱.
 * 지원: GitHub, GitLab, X (twitter), Instagram, LinkedIn, YouTube, Medium, Dribbble, Behance, Telegram. */
function parseProfileUrl(url: string): { service: string; username: string } | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const seg = parsed.pathname.split("/").filter(Boolean);

  if (host === "github.com" && seg[0]) return { service: "github", username: seg[0] };
  if (host === "gitlab.com" && seg[0]) return { service: "gitlab", username: seg[0] };
  if ((host === "twitter.com" || host === "x.com") && seg[0]) return { service: "x", username: seg[0] };
  if (host === "instagram.com" && seg[0]) return { service: "instagram", username: seg[0] };
  if (host === "linkedin.com" && seg[0] === "in" && seg[1]) return { service: "linkedin", username: seg[1] };
  if (host === "youtube.com") {
    if (seg[0]?.startsWith("@")) return { service: "youtube", username: seg[0].slice(1) };
    if ((seg[0] === "user" || seg[0] === "c") && seg[1]) return { service: "youtube", username: seg[1] };
  }
  if (host === "medium.com" && seg[0]) {
    const u = seg[0].startsWith("@") ? seg[0].slice(1) : seg[0];
    return { service: "medium", username: u };
  }
  if (host === "dribbble.com" && seg[0]) return { service: "dribbble", username: seg[0] };
  if (host === "behance.net" && seg[0]) return { service: "behance", username: seg[0] };
  if ((host === "t.me" || host === "telegram.me") && seg[0]) return { service: "telegram", username: seg[0] };

  return null;
}

/**
 * Team member 의 avatar URL 도출.
 * 우선순위:
 *   1. 명시적 avatar_url
 *   2. GitHub URL → github.com/{user}.png (자체 endpoint, 외부 의존 X)
 *   3. SNS URL (X / Instagram / LinkedIn 등) → unavatar.io proxy
 *   4. 그 외 도메인 → unavatar.io 의 favicon fallback
 * Work 의 TeamMember 와 Project 의 TeamMember 모두 지원하는 최소 shape 만 받음. */
export function deriveTeamMemberAvatar(member: {
  url?: string;
  avatar_url?: string;
}): string | null {
  if (member.avatar_url) return member.avatar_url;
  if (!member.url) return null;

  // GitHub — 자체 endpoint 사용 (가장 빠르고 안정적)
  const githubMatch = member.url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)/i);
  if (githubMatch?.[1]) return `https://github.com/${githubMatch[1]}.png?size=200`;

  // SNS — unavatar.io 의 service-specific endpoint
  const parsed = parseProfileUrl(member.url);
  if (parsed) return `https://unavatar.io/${parsed.service}/${parsed.username}`;

  // unknown 도메인 — unavatar.io 가 favicon 으로 fallback
  try {
    const host = new URL(member.url).hostname;
    return `https://unavatar.io/${host}`;
  } catch {
    return null;
  }
}

/** 이름 첫 글자 추출 — 빈 문자열이면 "?" */
export function getMemberInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

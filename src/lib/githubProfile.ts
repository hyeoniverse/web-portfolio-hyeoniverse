import type { User } from "@supabase/supabase-js";
import type { SocialLink } from "@/types/social";
import { getSecret } from "@/lib/getSecret";

/**
 * GitHub 계정에서 저자 프로필을 채운다.
 *
 * Supabase 가 `identity_data` 에 담아 두는 값은 다음이 전부다.
 *   iss · sub · name · full_name · user_name · email · avatar_url ·
 *   provider_id · email_verified · phone_verified · preferred_username
 *
 * 소개(bio)·소속(company)·블로그·트위터는 들어 있지 않아 공개 API 를 따로 읽는다.
 * 공개 정보라 토큰 없이도 되고, 있으면 rate limit 이 시간당 60 → 5000 이 된다.
 */

export interface GithubAuthorFields {
  name: string;
  avatar: string;
  /** 직함 자리 — GitHub 의 company. 소속 표기가 대부분이라 완전히 같지는 않다. */
  role: string;
  email: string;
  bio: string;
  /** 활동 지역 — GitHub 의 location. */
  location: string;
  links: SocialLink[];
  /** GitHub 공개 API 까지 읽었는지. false 면 identity 에 있는 값만 채워진 것이다. */
  enriched: boolean;
}

const str = (v: unknown): string => (typeof v === "string" && v ? v : "");

/** 이 계정의 GitHub identity_data. GitHub 로 가입하지 않았으면 빈 객체다. */
function githubIdentity(user: User): Record<string, unknown> {
  return ((user.identities ?? []).find((i) => i.provider === "github")?.identity_data ?? {}) as Record<string, unknown>;
}

/** GitHub 로그인 아이디(user_name). 없으면 빈 문자열. */
export function githubLogin(user: User): string {
  const gh = githubIdentity(user);
  return str(gh.user_name) || str(gh.preferred_username);
}

/** 스킴 없이 적어 둔 주소를 링크로 쓸 수 있게 보정한다. */
function toUrl(v: string): string {
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

/**
 * identity + 공개 API 로 프로필 필드를 만든다.
 *
 * 공개 API 호출이 실패해도 identity 에 있는 이름·아바타·이메일은 채워서 돌려준다
 * (`enriched: false`). 로그인 흐름에서도 쓰이므로 짧은 타임아웃을 건다.
 */
export async function buildGithubAuthorFields(user: User): Promise<GithubAuthorFields> {
  const gh = githubIdentity(user);
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const login = githubLogin(user);

  const base: GithubAuthorFields = {
    name:
      str(meta.full_name) || str(meta.name) || str(meta.user_name) ||
      str(gh.full_name) || str(gh.name) || login ||
      (user.email ? user.email.split("@")[0] : ""),
    avatar: str(meta.avatar_url) || str(gh.avatar_url),
    role: "",
    email: user.email ?? str(gh.email),
    bio: "",
    location: "",
    links: login ? [{ platform: "github", url: `https://github.com/${login}` }] : [],
    enriched: false,
  };

  if (!login) return base;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 4000);
  try {
    const token = await getSecret("GITHUB_TOKEN").catch(() => null);
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: ac.signal,
    });
    if (!res.ok) return base;
    const j = (await res.json()) as Record<string, unknown>;

    const links: SocialLink[] = [];
    const htmlUrl = str(j.html_url) || `https://github.com/${login}`;
    links.push({ platform: "github", url: htmlUrl });
    const blog = toUrl(str(j.blog));
    if (blog) links.push({ platform: "blog", url: blog });
    const twitter = str(j.twitter_username);
    if (twitter) links.push({ platform: "twitter", url: `https://x.com/${twitter}` });

    return {
      name: str(j.name) || base.name,
      avatar: str(j.avatar_url) || base.avatar,
      // company 는 "@조직" 형태로 적히는 경우가 많다.
      role: str(j.company).replace(/^@/, ""),
      email: base.email || str(j.email),
      bio: str(j.bio),
      location: str(j.location),
      links,
      enriched: true,
    };
  } catch {
    return base;
  } finally {
    clearTimeout(timer);
  }
}

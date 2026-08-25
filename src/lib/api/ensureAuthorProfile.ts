import type { SupabaseClient, User } from "@supabase/supabase-js";
import { siteConfig } from "@/config/site.config";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getUserRole } from "./roles";
import { buildGithubAuthorFields } from "@/lib/githubProfile";
import type { Author } from "@/types/author";
import { OWNER_AUTHOR_ID } from "@/utils/resolvePostAuthors";

/**
 * 로그인한 멤버에게 자기 저자 프로필이 있는지 보장한다.
 *
 * 초대는 `author_id` 를 실어 나르지만, 그 id 가 가리키는 프로필은 소유자가 미리 만들어 둬야
 * 했다. 만들지 않고 기존 프로필을 골라 초대하면 서로 다른 계정이 같은 프로필을 공유한다.
 * 실제로 소유자 프로필을 다른 계정이 함께 가리키는 상태가 만들어졌고, 그러면 `canEditPost` 가
 * 그 계정에게 소유자 글의 편집권을 준다. 화면 쪽에는 이미 우회가 여러 군데 들어가 있지만
 * (AuthorsEditor 의 isMine·memberForAuthor) `app_metadata` 의 값 자체는 그대로였다.
 *
 * 그래서 첫 로그인 시점에 두 가지를 처리한다.
 *   1. 가리키는 프로필이 없으면 GitHub identity 로 하나 만들어 연결한다.
 *   2. 남의 프로필(이메일이 다른 프로필)을 가리키고 있으면 자기 프로필로 옮긴다.
 *
 * 소유자도 대상이다. 작성자가 지정되지 않은 글이 소유자 프로필로 표시되므로 그 프로필이
 * 없으면 안 되고, 배열 맨 앞에 있어야 설정 화면에서도 기본 저자로 읽힌다.
 *
 * @returns 계정의 author_id 를 바꿨으면 true (호출부에서 세션 새로고침 필요).
 */
export async function ensureAuthorProfile(admin: SupabaseClient, user: User): Promise<boolean> {
  /* 콜백은 consumeInvite 로 app_metadata 를 쓴 직후에 이 함수를 부른다. 인자로 받은 user 는
     그 쓰기 전에 읽은 것이라 author_id 가 낡아 있다. 현재 값을 다시 읽는다. */
  const { data: fresh } = await admin.auth.admin.getUserById(user.id);
  const current = fresh?.user ?? user;
  const role = getUserRole(current);

  if (role.role !== "author" && !role.isOwner) return false;

  const email = current.email?.toLowerCase() ?? "";
  if (!email) return false;

  const config = await getSiteConfig();
  const authors = ((config.authors as Author[] | undefined) ?? []).slice();

  /* 소유자는 별도로 다룬다. 작성자가 지정되지 않은 글은 소유자 프로필로 표시되므로
     (resolvePostAuthors) 그 프로필이 반드시 있어야 한다. 실제로 설정에서 저자를 편집하다
     소유자 프로필이 배열에서 빠져, 남아 있던 다른 프로필이 모든 글의 작성자로 표시된 적이 있다.
     없으면 다시 만들고, 항상 배열 맨 앞에 둔다. */
  if (role.isOwner) {
    const idx = authors.findIndex((a) => a.id === OWNER_AUTHOR_ID);
    if (idx === 0) return false;
    if (idx > 0) {
      const [ownerProfile] = authors.splice(idx, 1);
      authors.unshift(ownerProfile);
    } else {
      authors.unshift(await authorFromGithub(current, OWNER_AUTHOR_ID));
    }
    await writeAuthors(admin, authors);
    // app_metadata.author_id 가 비어 있으면 소유자 프로필로 연결해 둔다.
    if (role.authorId !== OWNER_AUTHOR_ID) {
      await admin.auth.admin.updateUserById(current.id, { app_metadata: { author_id: OWNER_AUTHOR_ID } });
      return true;
    }
    return false;
  }

  const linked = authors.find((a) => a.id === role.authorId);
  const isSomeoneElses = !!linked?.email && linked.email.toLowerCase() !== email;
  if (linked && !isSomeoneElses) return false; // 이미 자기 프로필

  // 이메일이 같은 프로필이 이미 있으면 새로 만들지 않고 그쪽으로 연결한다.
  const byEmail = authors.find((a) => a.email && a.email.toLowerCase() === email);
  const targetId = byEmail?.id ?? `author-${current.id}`;

  if (!byEmail) {
    authors.push(await authorFromGithub(current, targetId));
    await writeAuthors(admin, authors);
  }

  if (role.authorId === targetId) return false;
  await admin.auth.admin.updateUserById(current.id, { app_metadata: { author_id: targetId } });
  return true;
}

/** GitHub 계정 정보로 새 저자 프로필을 만든다. 채울 수 있는 항목(소개·소속·링크)까지 모두 넣는다. */
async function authorFromGithub(user: User, id: string): Promise<Author> {
  const g = await buildGithubAuthorFields(user);
  return { id, name: g.name, avatar: g.avatar, role: g.role, email: g.email, bio: g.bio, location: g.location, links: g.links };
}

/**
 * site_settings 의 authors 를 통째로 갈아 끼운다.
 * getSiteConfig 의 deepMerge 는 배열을 병합하지 않고 교체하므로 전체 배열을 넣어야 한다.
 * 저장 형식은 { delta, savedDefaults } 지만 레거시(전체 config) 행도 있어 있는 모양을 유지한다.
 */
async function writeAuthors(admin: SupabaseClient, authors: Author[]): Promise<void> {
  const { data } = await admin.from("site_settings").select("config").eq("id", "default").maybeSingle();
  const raw = (data?.config ?? {}) as Record<string, unknown>;
  const isDelta = !!raw.delta && typeof raw.delta === "object";

  const next = isDelta
    ? {
        ...raw,
        delta: { ...(raw.delta as Record<string, unknown>), authors },
        /* 이 delta 를 저장한 시점의 코드 기본값 — 나중에 기본값이 바뀌면 설정 화면이 충돌로 알린다. */
        savedDefaults: {
          ...((raw.savedDefaults as Record<string, unknown>) ?? {}),
          authors: structuredClone(siteConfig.authors),
        },
      }
    : { ...raw, authors };

  await admin
    .from("site_settings")
    .upsert({ id: "default", config: next, updated_at: new Date().toISOString() });
}

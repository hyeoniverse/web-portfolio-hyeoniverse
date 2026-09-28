/* 자동 생성 — 고치지 마세요. 원본은 content/about/ 의 .md 입니다.
 * 다시 만들려면: npx tsx scripts/gen-about-fallback.ts (prebuild·dev 가 자동 실행)
 *
 * About 패널의 폴백. DB(동기화 결과)가 있으면 그게 이기고, 여기도 비어 있으면 화면이 빈다 —
 * 아직 아무것도 쓰지 않았다는 뜻이다. */
import type { TroubleShootingItem } from "@/data/about/types";
import type { CfgSecurity, CfgFeature, CfgProcess, OverviewValues } from "@/lib/about/panelMarkdown";

export const aboutDecisions: TroubleShootingItem[] = [
  {
    "id": "role-stored-in-app-metadata",
    "problem": {
      "ko": "역할·권한을 사용자 metadata 중 어디에 저장할 것인가",
      "en": "Where to store roles and permissions in user metadata"
    },
    "title": {
      "ko": "권한 데이터의 신뢰 경계 설계",
      "en": "Designing the trust boundary for permission data"
    },
    "definition": {
      "ko": "처음에는 관리자 계정 하나만 존재했기 때문에 별도의 권한 체계가 필요하지 않았다. 하지만 여러 명의 저자를 초대할 수 있도록 기능을 확장하면서, 계정마다 어디까지 관리할 수 있는지 권한을 설정할 필요가 있었다.\n\n권한은 세 단계로 나눴다.\n\n1. 사이트 설정과 저자 관리까지 할 수 있는 소유자\n2. 모든 글을 수정할 수 있는 저자\n3. 자신이 작성한 글만 수정할 수 있는 저자\n\n그러면 서버는 관리자 화면에서 요청을 받을 때마다 최소한 두 가지를 확인해야 한다.\n\n1. 요청을 보낸 계정의 역할이 무엇인가\n2. 그 역할로 요청한 작업을 수행할 수 있는가\n\n여기서 한 가지 결정할 것이 생긴다. **서버가 신뢰해야 하는 역할 정보를 어디에 저장하고, 어떻게 가져올 것인가.**\n\n이 프로젝트는 로그인과 인증에 `Supabase Auth` 를 사용한다. Supabase Auth 는 사용자마다 `user_metadata` 와 `app_metadata` 라는 두 개의 메타데이터 영역을 제공한다. 둘 다 사용자 정보에 포함되고 서비스에서 필요한 데이터를 저장할 수 있다. 따라서 Supabase 가 제공하는 사용자 메타데이터에 저장하는 방법을 우선 생각할 수 있고, 별도의 데이터베이스 테이블에 저장하는 방법도 고려할 수 있다.",
      "en": "With a single admin account there was no need for a permission model. Opening the site up to multiple authors changed that: each account needed a defined reach.\n\nPermissions were split into three tiers.\n\n1. An owner, who also manages site settings and authors\n2. An author who can edit every post\n3. An author who can edit only their own posts\n\nThe server then has to establish at least two things on every admin request.\n\n1. What role does the calling account hold\n2. Does that role allow the requested operation\n\nWhich raises a decision. **Where should the role the server must trust be stored, and how should it be read?**\n\nThis project uses `Supabase Auth` for sign-in. Supabase Auth gives every user two metadata areas, `user_metadata` and `app_metadata`. Both travel with the user record and both can hold whatever a service needs. So the metadata Supabase already provides is the first candidate, and a dedicated database table is the other."
    },
    "cause": {
      "ko": "### 1. user_metadata\n\n우선 `user_metadata` 에 저장하는 경우를 가정해 보자. 이미 사용자 정보에 포함되어 있고 별도의 테이블을 만들 필요도 없다. 예를 들어 이런 식으로 저장할 수 있다.\n\n```json\n{ \"role\": \"author\", \"permission_level\": 1 }\n```\n\n그런데 Supabase Auth 는 로그인한 사용자가 자신의 정보를 수정할 수 있도록 `updateUser()` API 를 제공한다.\n\n```ts\nawait supabase.auth.updateUser({\n  data: { displayName: \"새 이름\" },\n});\n```\n\n문제는 이 요청이 **사이트의 API 를 거치지 않고 클라이언트에서 Supabase Auth 로 직접 전달된다**는 것이다. 인증된 세션만 있으면, 사이트가 그 정보를 수정하는 화면을 제공하지 않아도 사용자가 자기 정보를 바꿀 수 있다.\n\n[[viz]]\n\n예를 들어 사용자는 브라우저 콘솔에서 직접 `updateUser()` 를 호출할 수 있다.\n\n```ts\nawait supabase.auth.updateUser({\n  data: { role: \"owner\" },\n});\n```\n\n서버가 `user_metadata.role` 을 기준으로 권한을 판단한다면, 저자가 자신의 역할을 `owner` 로 바꾼 뒤 소유자 권한을 얻을 수 있다. 결국 서버는 그 데이터를 권한 판단의 근거로 신뢰할 수 없다. Supabase 공식 문서도 `user_metadata` 를 **보안에 민감한 정보나 인가 로직에 쓰지 말라**고 명시한다.\n\n**권한 정보를 저장할 때는 사용자가 자신의 권한을 변경할 수 없어야 한다.** 표시 이름이나 알림 설정처럼 사용자가 자유롭게 바꿔도 되는 값과 달리, 권한은 서버가 인가 여부를 판단하기 위해 신뢰해야 하는 값이기 때문이다.\n\n### 2. app_metadata\n\n`app_metadata` 도 사용자 정보에 포함되지만 수정 방식이 다르다. 일반적인 클라이언트 요청으로는 수정할 수 없고, 변경하려면 서버에서 관리자 권한을 사용해야 한다.\n\n[[viz]]\n\n`service-role` 키는 데이터베이스의 접근 제한을 모두 통과하기 때문에 클라이언트에 노출하지 않고 서버에서만 사용한다. 즉 이 구조에서는 **권한을 변경할 수 있는 주체를 서버로 제한할 수 있다**. 따라서 `role` 이나 `permission_level` 처럼 사용자가 임의로 바꿔서는 안 되는 값은 `app_metadata` 에 저장하는 것이 적합하다.\n\nSupabase 공식 문서에서도 `raw_app_meta_data` 는 사용자가 업데이트할 수 없어 인가 데이터를 저장하기에 적합하다고 설명한다. 반대로 `raw_user_meta_data` 는 인증된 사용자가 수정할 수 있어 적합하지 않다고 명시한다.\n\n### 3. 별도의 권한 테이블\n\n역할 정보를 Supabase Auth 의 사용자 정보에 넣지 않고, 애플리케이션 데이터베이스에서 따로 관리하는 방법도 있다.\n\n```sql\nuser_permissions\n  user_id\n  role\n  permission_level\n  author_id\n```\n\n저장과 변경을 모두 서버에서 관리하므로, 이 방법 역시 사용자가 자기 권한을 임의로 바꾸는 문제를 막을 수 있다. 두 방식의 보안 조건이 비슷하다면, 다음은 실제로 권한을 사용하는 과정을 비교할 차례다.\n\n서버가 관리자 요청을 처리할 때는 요청자가 실제로 인증된 사용자인지 먼저 확인해야 한다. 이 프로젝트에서는 `supabase.auth.getUser()` 가 그 역할을 한다. 그리고 `getUser()` 가 돌려주는 사용자 정보에는 `app_metadata` 가 포함되어 있다.\n\n[[viz]]\n\n따라서 `app_metadata` 에 역할을 저장하면 역할을 확인하려고 **조회를 추가할 필요가 없다**. 인증 확인으로 이미 받아 온 사용자 정보 안에 역할이 함께 들어 있기 때문이다. 반면 별도의 권한 테이블을 쓰면 `getUser()` 의 결과만으로는 역할을 알 수 없어, 권한을 확인할 때마다 그 테이블을 한 번씩 더 조회해야 한다.\n\n### 권한이 변경된다면\n\n역할에는 한 가지 특성이 더 있다. **고정된 값이 아니다.** 소유자는 기존 멤버의 권한을 나중에 바꿀 수 있다. 모든 글을 수정할 수 있던 저자를 자기 글만 수정할 수 있는 저자로 내리는 것도 가능하다. 그래서 서버가 오래된 권한으로 요청을 처리하지 않는지도 확인해야 한다.\n\n서버는 브라우저가 들고 있는 세션의 사용자 정보를 그대로 믿는 대신 `supabase.auth.getUser()` 를 호출한다. `getUser()` 는 Auth 서버에 네트워크 요청을 보내 access token 을 검증하고 현재 사용자 정보를 다시 확인한다. 따라서 서버의 권한 판단은 클라이언트가 들고 있는 사용자 객체가 아니라 **Auth 서버에서 확인한 값**을 기준으로 한다.\n\n반면 관리자 화면은 바뀐 권한에 맞춰 메뉴를 다시 그려야 한다. 권한을 바꾸는 쪽(소유자)과 영향을 받는 쪽(대상 계정)이 서로 다른 사용자라 응답으로는 전달할 수 없어서, 권한을 변경한 서버가 대상 계정 채널로 Realtime broadcast 를 보내고 받은 쪽이 세션을 새로 고친다. 다만 이것은 어디까지나 **화면을 최신 권한에 맞추기 위한 처리**다. 실제로 요청을 허용할지는 언제나 서버가 판단한다.",
      "en": "### 1. user_metadata\n\nStart with `user_metadata`. It already travels with the user record and needs no table of its own. It could hold something like this.\n\n```json\n{ \"role\": \"author\", \"permission_level\": 1 }\n```\n\nBut Supabase Auth exposes `updateUser()` so that a signed-in user can edit their own record.\n\n```ts\nawait supabase.auth.updateUser({\n  data: { displayName: \"New name\" },\n});\n```\n\nThe catch is that this request **goes straight from the client to Supabase Auth without passing through the site's API**. An authenticated session is enough; the site does not have to offer an edit screen for the user to change their own record.\n\n[[viz]]\n\nA user can call `updateUser()` from the browser console.\n\n```ts\nawait supabase.auth.updateUser({\n  data: { role: \"owner\" },\n});\n```\n\nIf the server decided permissions from `user_metadata.role`, an author could rewrite their role as `owner` and take owner access. The server cannot treat that value as evidence. Supabase's own documentation says not to use `user_metadata` for security-sensitive information or authorization logic.\n\n**Permission data has to be something the user cannot change about themselves.** Unlike a display name or a notification preference, which the user is free to set, a permission is a value the server must trust in order to authorize.\n\n### 2. app_metadata\n\n`app_metadata` also travels with the user record, but it is written differently. An ordinary client request cannot modify it; changing it requires admin credentials on the server.\n\n[[viz]]\n\nThe `service-role` key clears every access restriction in the database, so it is never exposed to the client and lives only on the server. That structure **confines permission changes to the server**. Values a user must not set for themselves — `role`, `permission_level` — therefore belong in `app_metadata`.\n\nSupabase's documentation says the same: `raw_app_meta_data` cannot be updated by the user and is suitable for authorization data, while `raw_user_meta_data` can be updated by an authenticated user and is not.\n\n### 3. A dedicated permissions table\n\nThe role could also live outside Supabase Auth, in the application's own database.\n\n```sql\nuser_permissions\n  user_id\n  role\n  permission_level\n  author_id\n```\n\nStorage and updates both stay on the server, so this option also prevents a user from rewriting their own permission. With the security properties comparable, the next question is what each costs at read time.\n\nHandling an admin request starts by confirming the caller is authenticated, which in this project is `supabase.auth.getUser()`. The user record it returns already contains `app_metadata`.\n\n[[viz]]\n\nStoring the role in `app_metadata` therefore **adds no query** — the role arrives inside the record the auth check already fetched. With a dedicated table, `getUser()` alone cannot tell you the role, so every permission check costs one more query against that table.\n\n### When permissions change\n\nRoles have one more property: **they are not fixed.** An owner can change an existing member's permission later, demoting an editor to an author who may only touch their own posts. So the server also has to avoid deciding on a stale permission.\n\nRather than trusting the user record held in the browser's session, the server calls `supabase.auth.getUser()`. That call sends a network request to the Auth server, validates the access token, and re-reads the current user record. The server's decision therefore rests on **what the Auth server confirms**, not on the client's copy.\n\nThe admin screen, on the other hand, has to redraw its menus for the new permission. The account making the change (the owner) and the account affected are different users, so the answer cannot carry it. Instead the server broadcasts on the target account's Realtime channel and the receiving client refreshes its session. That is purely **about keeping the screen current**. Whether a request is allowed is always decided by the server."
    },
    "solution": {
      "ko": "현재 프로젝트에서 관리할 권한 정보는 `role`, `permission_level`, `author_id` 정도로 복잡하지 않다. 이 정도를 사용자 정보에 함께 저장해도 구조적으로 문제가 없으므로, 권한 확인을 위해 조회를 하나 더 붙이는 것보다 `app_metadata` 에 함께 저장하는 쪽이 이 구조에 더 맞다고 판단했다.\n\n```json\n{\n  \"role\": \"author\",\n  \"permission_level\": 1,\n  \"author_id\": \"...\"\n}\n```\n\n서버는 `getUser()` 로 가져온 사용자 정보에서 `app_metadata` 를 읽어 역할을 판단한다.\n\n```ts\nexport function getUserRole(user: User | null | undefined): UserRole {\n  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;\n  const isOwner = meta.role === \"owner\"\n    || (!!ownerEmail && user.email?.toLowerCase() === ownerEmail);\n  if (isOwner) return { role: \"owner\", level: Infinity, authorId, isOwner: true };\n  ...\n}\n```\n\n결과적으로 요청 처리는 이렇게 정리된다.\n\n[[viz]]\n\n마지막 단계인 대상 글 확인은 `canEditPost` 가 맡는다. 소유자와 모든 글을 수정할 수 있는 저자는 그대로 통과하고, 자기 글만 수정할 수 있는 저자는 글의 `author_ids` 에 자신이 포함된 경우에만 통과한다.",
      "en": "The permission data this project has to manage is not complex — `role`, `permission_level`, `author_id`. Carrying that much inside the user record poses no structural problem, so storing it in `app_metadata` fits this design better than adding a query for every permission check.\n\n```json\n{\n  \"role\": \"author\",\n  \"permission_level\": 1,\n  \"author_id\": \"...\"\n}\n```\n\nThe server reads `app_metadata` off the user record returned by `getUser()` and resolves the role from it.\n\n```ts\nexport function getUserRole(user: User | null | undefined): UserRole {\n  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;\n  const isOwner = meta.role === \"owner\"\n    || (!!ownerEmail && user.email?.toLowerCase() === ownerEmail);\n  if (isOwner) return { role: \"owner\", level: Infinity, authorId, isOwner: true };\n  ...\n}\n```\n\nRequest handling then reduces to this.\n\n[[viz]]\n\nThe final step, the per-post check, is handled by `canEditPost`. An owner and an editor pass straight through; an author passes only when their id appears in the post's `author_ids`."
    },
    "keyInsight": {
      "ko": "**서버가 신뢰해야 하는 값은, 신뢰할 수 있는 경계 안에서만 변경되고 확인되도록 설계해야 한다.**\n\n권한 정보는 일반적인 사용자 설정과 다르게 다뤄야 한다. 표시 이름이나 알림 설정은 사용자가 직접 바꿔도 서비스의 권한 판단에 영향을 주지 않는다. 반면 `role` 이나 `permission_level` 은 서버가 요청을 허용할지 결정하는 기준이다.\n\n따라서 두 종류의 데이터를 같은 방식으로 다루면 안 된다. 사용자가 자신의 권한을 바꿀 수 없어야 하고, 권한을 바꾸는 작업 역시 서버가 통제할 수 있어야 한다. 또 권한이 바뀔 수 있는 값이라면 서버가 오래된 정보로 판단하지 않도록 요청 시점의 값을 확인해야 한다.\n\n결국 권한 데이터에서 중요한 것은 단순히 **어디에 저장하는가**가 아니다. **누가 바꿀 수 있고, 서버는 어떤 경로로 그 값을 신뢰할 것인가**를 함께 설계하는 일이다.",
      "en": "**A value the server must trust should only be changed and verified inside a boundary the server can trust.**\n\nPermission data cannot be handled like ordinary user settings. A display name or a notification preference can be changed by the user without affecting any authorization decision. `role` and `permission_level` are what the server decides requests on.\n\nThe two kinds of data therefore cannot share a mechanism. The user must not be able to change their own permission, and changing a permission has to stay under the server's control. And because a permission can change later, the server has to read the value as of the request rather than an older copy.\n\nWhat matters about permission data is not simply **where it is stored**. It is designing **who can change it, and through which path the server comes to trust it**."
    },
    "section": {
      "ko": "인증 / 인가",
      "en": "Authentication & Authorization"
    },
    "difficulty": 2,
    "vizKey": "perm-store"
  },
  {
    "id": "authorization-moves-to-code-when-rls-is-bypassed",
    "problem": {
      "ko": "공개 API 가 관리자 화면의 초안·휴지통 조회까지 겸할 때 인가를 어디서 할 것인가",
      "en": "Where to authorize when one public API also serves the admin screen's drafts and trash"
    },
    "title": {
      "ko": "인가 판정을 코드에서 데이터베이스 규칙으로 옮긴다",
      "en": "Moving the authorization decision from code into database rules"
    },
    "definition": {
      "ko": "글 목록을 내려주는 API 가 하나 있다. 방문자가 목록 화면을 열면 이 API 가 발행된 글을 돌려준다.\n\n관리자 화면도 같은 목록이 필요한데, 여기서는 아직 발행하지 않은 초안과 휴지통에 있는 글까지 보여야 한다. API 를 새로 만드는 대신 같은 API 에 조건을 붙여 쓰기로 했다. 주소 뒤에 `?all=true` 를 붙이면 초안까지, `?trash=true` 를 붙이면 휴지통까지 돌려주는 방식이다.\n\n문제는 이 조건이 붙은 요청에도 **서버가 로그인 여부를 확인하지 않았다**는 점이다. 주소만 알면 누구나 초안을 읽을 수 있었다.",
      "en": "One API returns the list of posts. When a visitor opens the list screen, it returns published posts.\n\nThe admin screen needs the same list, except it also has to show unpublished drafts and everything sitting in the trash. Rather than build a second API, the same one was reused with query parameters: `?all=true` includes drafts, `?trash=true` includes the trash.\n\nThe problem was that the server never checked whether the caller was signed in when those parameters were present. Knowing the URL was enough to read the drafts."
    },
    "cause": {
      "ko": "데이터베이스에 접근하는 방법이 두 가지다.\n\n하나는 요청자의 로그인 세션을 그대로 넘기는 방식이다. 이 경우 Row Level Security 가 작동한다. 테이블마다 누가 어떤 행을 볼 수 있는지 규칙을 미리 걸어 두면, 데이터베이스가 요청자를 보고 알아서 걸러 준다. 코드가 조건을 빠뜨려도 데이터베이스가 막는다.\n\n다른 하나는 service-role 키를 쓰는 방식이다. 이 키는 그 규칙을 전부 통과한다.\n\n당시 이 테이블에 걸려 있던 규칙은 하나뿐이었다. **발행된 글만 보인다.** 초안은 그 규칙에 걸리므로, 관리자 화면이 초안을 보려면 규칙을 통과하는 키를 쓸 수밖에 없다고 판단했다.\n\n두 번째를 쓰는 순간 요청자가 관리자인지 확인할 책임이 **데이터베이스에서 API 코드로 넘어온다**. 그 확인이 빠져 있었다.\n\n그런데 이 판단에는 확인하지 않은 전제가 하나 있다. 규칙이 볼 수 있는 것을 **행의 값뿐이라고 여긴 것**이다. 규칙은 그 행이 발행됐는지만이 아니라 요청자가 누구인지도 볼 수 있다. \"발행된 글이거나, 요청자가 관리자이면 보인다\" 를 규칙으로 쓸 수 있다면 우회할 이유 자체가 사라진다.",
      "en": "There are two ways to reach the database.\n\nThe first forwards the caller's session. That keeps Row Level Security in play: each table carries rules about who may see which rows, and the database filters by caller on its own. Even if the code forgets a condition, the database still refuses.\n\nThe second uses the service-role key, which clears all of those rules.\n\nAt the time this table carried exactly one rule: **only published posts are visible.** Drafts fall outside it, so the conclusion was that an admin screen needing drafts had no choice but the key that clears the rule.\n\nThe moment you take that second path, confirming that the caller is an administrator moves from the database into the API code. That confirmation was missing.\n\nBut that conclusion rests on an assumption nobody checked: that a rule can only look at **the values in the row**. A rule can also look at who is asking. If \"visible when the post is published, or when the caller is an administrator\" can be written as a rule, the reason to bypass disappears."
    },
    "solution": {
      "ko": "규칙이 요청자를 보려면 요청 안에 역할이 실려 있어야 한다. 이 프로젝트는 역할을 `app_metadata` 에 저장하고, 그 값은 로그인할 때 발급되는 access token 안에 함께 들어간다. 데이터베이스는 그 토큰을 `auth.jwt()` 로 읽을 수 있다. 조회를 따로 붙이지 않아도 규칙이 역할을 알 수 있다는 뜻이다.\n\n그래서 토큰에서 역할을 꺼내는 함수를 만들고, 규칙이 그 함수를 쓰도록 했다.\n\n```sql\nCREATE FUNCTION is_admin() RETURNS boolean AS $$\n  SELECT app_role() = 'owner' OR app_level() >= 2;\n$$;\n\nCREATE FUNCTION can_edit_post(target_author_ids text[]) RETURNS boolean AS $$\n  SELECT is_owner()\n      OR app_level() >= 2\n      OR (app_role() = 'author'\n          AND app_author_id() IS NOT NULL\n          AND app_author_id() = ANY (coalesce(target_author_ids, '{}')));\n$$;\n```\n\n글 테이블에는 이 함수를 쓰는 규칙을 걸었다. 조회·수정·삭제가 `can_edit_post` 하나로 묶인다. 소유자와 관리자는 전부, 저자는 자기 글만이다. 기존 공개 규칙은 그대로 남아 있어 발행된 글은 누구에게나 보인다.\n\n```sql\nCREATE POLICY posts_admin_select ON posts\n  FOR SELECT TO authenticated\n  USING (can_edit_post(author_ids));\n```\n\n이제 API 는 요청자의 세션을 그대로 넘긴다. `?all=true` 가 붙어도 클라이언트를 바꾸지 않는다. 무엇이 보이는지는 코드가 아니라 규칙이 정한다.\n\n```ts\nlet supabase = await createClient();\nif (showAll || showTrash) {\n  const auth = await requireAuth();\n  if (auth.error) return auth.error;\n  supabase = auth.supabase;\n}\n```\n\n우회가 여전히 필요한 곳은 남는다. **사이트 전체를 훑는 집계**가 그렇다. 인기글 판정을 요청자의 시야로 좁히면 자기 글만 집계돼 결과가 달라진다. **사이트 설정**도 그렇다. 설정은 한 행짜리 문서인데 저자에게 허용되는 범위가 그 문서 안의 일부라서, 행 단위로 판정하는 규칙으로는 표현할 수 없다. 이런 곳은 우회를 유지하고 왜 유지하는지를 코드에 적어 두었다.",
      "en": "For a rule to see the caller, the request has to carry the role. This project stores the role in `app_metadata`, and that value is embedded in the access token issued at sign-in. The database can read that token with `auth.jwt()`, so a rule can know the role without a query of its own.\n\nSo the role is pulled out of the token by functions, and the rules call those functions.\n\n```sql\nCREATE FUNCTION is_admin() RETURNS boolean AS $$\n  SELECT app_role() = 'owner' OR app_level() >= 2;\n$$;\n\nCREATE FUNCTION can_edit_post(target_author_ids text[]) RETURNS boolean AS $$\n  SELECT is_owner()\n      OR app_level() >= 2\n      OR (app_role() = 'author'\n          AND app_author_id() IS NOT NULL\n          AND app_author_id() = ANY (coalesce(target_author_ids, '{}')));\n$$;\n```\n\nThe posts table carries rules built on those functions. Read, update, and delete all resolve through the single `can_edit_post` predicate: owners and administrators reach everything, an author reaches only their own posts. The existing public rule stays in place, so published posts remain visible to everyone.\n\n```sql\nCREATE POLICY posts_admin_select ON posts\n  FOR SELECT TO authenticated\n  USING (can_edit_post(author_ids));\n```\n\nThe API now forwards the caller's session. `?all=true` no longer switches clients; it only changes the filter. What comes back is decided by the rules, not by the code.\n\n```ts\nlet supabase = await createClient();\nif (showAll || showTrash) {\n  const auth = await requireAuth();\n  if (auth.error) return auth.error;\n  supabase = auth.supabase;\n}\n```\n\nSome places still bypass. **Aggregates that span the whole site** are one: narrowing the popularity ranking to the caller's view would count only their own posts and change the result. **Site settings** are another: the settings live in a single-row document, and what an author may change is a slice inside that document, which a row-level rule cannot express. Those places keep the bypass, with the reason written next to it."
    },
    "keyInsight": {
      "ko": "우회는 결정이 아니라 출발점이었다. 관리자 화면을 만들 때부터 service-role 로 붙어 있었고, \"이 경로가 왜 규칙을 통과할 수 없는가\" 라는 질문은 데이터가 새고 나서야 나왔다. 규칙이 행의 값만 볼 수 있다고 여긴 전제를 한 번도 확인하지 않은 것이다.\n\n**기본값은 차단이어야 한다.** 전부 열어 둔 채로 코드가 매번 공개 조건을 빠뜨리지 않기를 기대하는 구조는 한 번의 실수로 무너진다. 규칙으로 옮기면 코드가 조건을 빠뜨려도 데이터베이스가 남은 한 겹을 맡는다.\n\n옮긴 대가도 있다. 규칙은 요청에 실린 토큰을 보므로, 권한을 낮춰도 그 계정의 토큰이 갱신될 때까지는 이전 권한이 유효하다. 서버가 매 요청 `getUser()` 로 확인하던 방식은 즉시 반영됐다.\n\n이 지연은 그대로 두지 않았다. `getUser()` 는 Auth 서버에 물어 현재 `app_metadata` 를 돌려주고, 같은 요청이 데이터베이스로 보내는 쿼리에는 브라우저가 들고 있는 토큰이 실린다. 그래서 인증 헬퍼가 매 요청 두 값을 비교한다. 판정에 쓰이는 세 클레임(`role`·`permission_level`·`author_id`)이 어긋날 때만 세션을 갱신하므로 평상시 비용은 없다. 토큰을 열어 보긴 하지만 비교용이라 서명은 다시 확인하지 않는다. 그 검증은 이미 끝나 있다.\n\n응답의 모양도 달라진다. 규칙에 걸린 요청은 거부가 아니라 **빈 결과**로 돌아온다. 권한이 없는 대상과 존재하지 않는 대상이 똑같이 0행이 되므로, 그대로 두면 멀쩡히 있는 글에도 \"없음\" 이라고 답하게 된다.\n\n그래서 **판정과 강제를 나눴다.** 판정은 우회 키로 `author_ids` 하나만 읽어 정한다. 대상이 없으면 404, 있는데 권한이 없으면 사유를 담은 403 이다. 읽은 값은 응답에 싣지 않는다. 실제 읽기·쓰기는 요청자의 세션으로 하므로 정책의 검사를 그대로 받는다. 코드가 판정을 틀려도 정책이 남고, 상태 코드는 정확해진다. 두 검사를 다 통과했는데도 정책이 행을 걸렀다면 토큰이 낡았다는 뜻이라, 그때도 404 가 아니라 다시 로그인하라는 403 으로 답한다.",
      "en": "The bypass was never a decision; it was the starting shape. The admin screens connected with the service-role key from the day they were built, and the question \"why can't this path satisfy the rules?\" only came up after data leaked. The assumption that a rule can only look at values in the row went unexamined the whole time.\n\n**The default has to be blocked.** Leaving everything open and trusting the code never to drop the public-only condition collapses on a single mistake. With the decision in the rules, a forgotten condition still meets one more layer in the database.\n\nMoving it has a cost. A rule reads the token attached to the request, so lowering someone's permission takes effect only once that account's token is refreshed, while the server's per-request `getUser()` check applied immediately.\n\nThat lag was not left alone. `getUser()` asks the Auth server for the current `app_metadata`, while the queries the same request sends to the database carry the token the browser is holding. So the auth helper compares the two on every request. It refreshes the session only when the three claims that drive the decision (`role`, `permission_level`, `author_id`) disagree, so there is no cost in the normal case. The token is decoded, but only for the comparison; the signature is not rechecked, because that verification has already happened.\n\nThe shape of the response changes too. A request the rules exclude comes back as an **empty result**, not a refusal. A target you may not touch and a target that does not exist both arrive as zero rows, so left alone it answers \"not found\" for posts that are plainly there.\n\nSo **the decision was split from the enforcement.** The decision is made by reading one column, `author_ids`, through the bypass key: no target gives 404, a target you may not touch gives 403 with a reason. What was read never reaches the response. The actual read or write goes through the caller's own session, so it still meets the rules. A decision the code gets wrong still runs into the policy, and the status code stays accurate. If both checks pass and the policy still filters the row, the token is stale, and that answers 403 asking for a fresh sign-in, not 404."
    },
    "section": {
      "ko": "인증 / 인가",
      "en": "Authentication & Authorization"
    },
    "difficulty": 3,
    "vizKey": "all-param-leak"
  },
  {
    "id": "delete-is-a-reversible-state-change",
    "problem": {
      "ko": "삭제를 행 제거로 처리할 것인가, 되돌릴 수 있는 상태 변경으로 처리할 것인가",
      "en": "Should deletion remove the row, or become a reversible state change?"
    },
    "title": {
      "ko": "삭제의 기본값은 복구 가능",
      "en": "Deletion defaults to recoverable"
    },
    "definition": {
      "ko": "관리자 화면에는 글과 작품을 지우는 버튼이 있다. 본문에 넣는 달력 블록도 지울 수 있다.\n\n이 사이트는 운영자가 한 명이다. 삭제를 실행하기 전에 검토해 주는 절차가 없고, 잘못 지웠을 때 대신 되살려 줄 사람도 없다. **지우는 순간이 곧 마지막 판단**이다.",
      "en": "The admin screens have buttons that delete posts and works. Calendar blocks embedded in a post can be deleted too.\n\nThe site has one operator. Nothing reviews a deletion before it happens, and no one else can restore something removed by mistake. The moment of deleting is the last judgement anyone makes."
    },
    "cause": {
      "ko": "두 가지 방식이 있다.\n\n하나는 데이터베이스에서 그 행을 실제로 지우는 것이다. 이후 코드가 단순해진다. 목록을 읽는 쿼리에 조건이 붙지 않고 저장 공간도 늘지 않는다. 대신 되돌릴 방법이 데이터베이스 백업을 통째로 복원하는 것밖에 없다.\n\n다른 하나는 행을 남겨 두고 지워진 시각만 기록하는 것이다. 흔히 soft delete 라고 부른다. 목록에서는 감추되 데이터는 남아 있으므로 되돌릴 수 있다. 대신 데이터를 읽는 모든 쿼리가 지워지지 않은 것만 골라내는 조건을 빠뜨리지 않아야 하고, 지운 행이 계속 쌓인다.",
      "en": "There are two ways to do it.\n\nOne is to actually remove the row. Everything downstream gets simpler: list queries carry no extra condition and storage does not grow. The only way back is restoring an entire database backup.\n\nThe other is to keep the row and record only the time it was deleted, commonly called a soft delete. The row is hidden from lists but the data survives, so it can be restored. In exchange, every read has to remember to select only the rows that are not deleted, and deleted rows keep accumulating."
    },
    "solution": {
      "ko": "행을 지우는 쪽이 코드는 단순하지만, 실수했을 때 **백업 복원 말고는 방법이 없다**. 운영자가 한 명이라 그 복원을 대신 해 줄 사람도 없다. 반대로 `deleted_at` 방식의 비용은 조회에 조건이 하나 붙는 것뿐이고, 그건 **코드가 한 번 감당하면 끝난다**.\n\n삭제는 `deleted_at` 에 시각을 기록하는 것으로 처리한다. 휴지통 화면이 그 행들을 모아 보여 주고, 거기서 복구한다. 지울 때 `purge_after` 에 보관 기한도 함께 적어 두고, 그 시각이 지나면 예약 작업이 하루에 한 번 실제로 지운다.\n\n```ts\n// 복구 — 기록해 둔 시각을 지우면 목록에 다시 나타난다\n.update({ deleted_at: null }).eq(\"id\", id)\n\n// 영구 삭제 — 전용 라우트에서만 호출된다\nexport async function purgeForever(table: TableName, id: string) { ... }\n```\n\n영구 삭제는 일반 삭제와 다른 API 로 분리했다. 주소가 `/api/posts/[id]/purge` 로 따로 있고, 휴지통 화면을 거치지 않으면 도달하지 않는다. 행이 쌓이는 문제는 보관 기한이 정리하므로 사람이 따로 챙기지 않는다.",
      "en": "Removing the row keeps the code simpler, but a mistake then has **no remedy short of restoring a backup** — and with a single operator there is nobody else to do that restoring. The cost of the `deleted_at` approach is one extra condition on reads, and **code pays that once**.\n\nDeleting writes a timestamp into `deleted_at`. The trash screen collects those rows and restores from there. The delete also records a retention deadline in `purge_after`; once that time passes, a scheduled job removes the row for real, once a day.\n\n```ts\n// 복구 — 기록해 둔 시각을 지우면 목록에 다시 나타난다\n.update({ deleted_at: null }).eq(\"id\", id)\n\n// 영구 삭제 — 전용 라우트에서만 호출된다\nexport async function purgeForever(table: TableName, id: string) { ... }\n```\n\nPermanent deletion lives behind a different API. It has its own address, `/api/posts/[id]/purge`, and is unreachable without going through the trash screen. The accumulation problem is handled by the retention deadline rather than by remembering to clean up."
    },
    "keyInsight": {
      "ko": "**되돌릴 수 없는 동작을 되돌릴 수 있는 동작과 같은 버튼에 두지 않는다.** 두 동작은 실수했을 때의 비용이 다르다.\n\n기본값은 복구 가능한 쪽이어야 한다. 영구 삭제는 기한이 지나 자동으로 일어나거나, 사용자가 따로 한 번 더 지정해야 일어난다.",
      "en": "An irreversible action does not belong on the same button as a reversible one. The cost of a mistake is not the same for both.\n\nThe default has to be the recoverable one. Permanent removal happens either because a retention deadline passed or because the user asked for it a second time, explicitly."
    },
    "section": {
      "ko": "데이터 / 정합성",
      "en": "Data & Integrity"
    },
    "difficulty": 1,
    "vizKey": "reversible-delete"
  },
  {
    "id": "optimistic-concurrency-with-a-version-counter",
    "problem": {
      "ko": "같은 글을 두 곳에서 편집할 때 나중 저장이 앞선 저장을 덮어쓰는 것을 어떻게 막을 것인가",
      "en": "Preventing a later save from silently overwriting an earlier one on the same post"
    },
    "title": {
      "ko": "충돌은 막지 말고 감지한다",
      "en": "Detect conflicts instead of preventing them"
    },
    "definition": {
      "ko": "글 편집기는 작성 중인 내용을 주기적으로 자동 저장한다. 그런데 같은 글을 두 곳에서 동시에 열 수 있다. 노트북에서 열어 둔 채 휴대폰에서 다시 여는 경우가 대표적이다.\n\n두 화면이 각자 편집하고 각자 저장하면 나중에 저장한 쪽이 앞선 쪽의 수정을 덮어쓴다. **덮어쓴 쪽도 덮어쓰인 쪽도 그 사실을 모른다.** 두 화면 모두에 저장됐다는 표시만 뜬다.",
      "en": "The editor autosaves while you write. The same post can also be open in two places at once, most often a laptop left open while the post is reopened on a phone.\n\nIf both screens edit and both save, the later save overwrites the earlier one. Neither side learns this happened. Both screens simply show that the post was saved."
    },
    "cause": {
      "ko": "막는 방법과 감지하는 방법이 있다.\n\n막는 방법은 잠금이다. 누군가 글을 열면 그 글을 잠가 다른 화면이 열지 못하게 한다. 확실하지만 잠금을 푸는 시점을 정해야 한다. 브라우저를 그냥 닫으면 잠금이 남고, 그 글은 한동안 아무도 고치지 못하게 된다.\n\n감지하는 방법은 버전 번호다. 글마다 수정될 때마다 1씩 오르는 숫자를 둔다. 편집기는 글을 열 때 그 숫자를 함께 받아 두었다가 저장할 때 되돌려 보낸다. 서버는 보내온 숫자가 지금 저장된 숫자와 같을 때만 저장한다. 다르면 그 사이에 누군가 저장했다는 뜻이다.\n\n이쪽은 잠금이 없으므로 열어 두기만 한 화면이 다른 화면을 막지 않는다. 대신 충돌이 났을 때 사용자에게 알리고 어떻게 할지 물어야 한다.",
      "en": "You can either prevent the collision or detect it.\n\nPreventing means locking. Opening a post locks it so no other screen can open it. That is airtight, but it needs a rule for releasing the lock. Closing the browser leaves the lock behind, and the post becomes uneditable for a while.\n\nDetecting means a version number. Each post carries a counter that increases by one on every save. The editor receives that number when it opens the post and sends it back when it saves. The server writes only if the number still matches what is stored. A mismatch means somebody saved in between.\n\nThis way nothing is locked, so a screen left open never blocks another. In exchange, a conflict has to be surfaced to the user with a choice about what to do."
    },
    "solution": {
      "ko": "잠금은 확실하지만 **드문 일을 막으려고 상시 비용을 내는 구조**다. 동시 수정은 자주 일어나지 않는데, 잠금을 언제 풀지는 항상 관리해야 하고 브라우저를 그냥 닫으면 남는다. 버전 번호는 평소에 아무것도 하지 않다가 어긋난 순간에만 걸린다.\n\n버전 번호를 쓴다. 저장 조건에 버전 일치를 넣고, 어긋나면 409 를 돌려준다.\n\n```ts\n// baseVersion 이 있으면 조건부 갱신(버전 일치할 때만) + version 증가.\nconst { data, error } = await admin\n  .from(\"posts\")\n  .update({ ...body, version: baseVersion + 1, updated_at: new Date().toISOString() })\n  .eq(\"id\", id)\n  .eq(\"version\", baseVersion)\n```\n\n마지막 줄이 핵심이다. 편집기가 글을 열 때 받아 간 숫자와 지금 저장된 숫자가 같은 행만 갱신된다. 그 사이 다른 화면이 저장했다면 숫자가 이미 올라가 있어 일치하는 행이 없고, 갱신된 행은 0개가 된다. 확인과 저장이 한 문장 안에서 일어나므로 그 사이에 다른 요청이 끼어들 틈이 없다.\n\n갱신이 0행이면 두 가지가 가능하다. 글이 지워졌거나, 버전이 어긋났거나다. 그래서 현재 버전을 한 번 더 읽어 둘을 구분하고, 충돌이면 409 와 현재 버전 번호를 함께 돌려준다.",
      "en": "Locking is airtight but **pays a standing cost to prevent a rare event**. Simultaneous edits are uncommon, yet lock release has to be managed at all times and a closed browser leaves one behind. A version counter does nothing until the moment values diverge.\n\nA version counter. Version equality goes into the save condition, and a mismatch returns 409.\n\n```ts\n// baseVersion 이 있으면 조건부 갱신(버전 일치할 때만) + version 증가.\nconst { data, error } = await admin\n  .from(\"posts\")\n  .update({ ...body, version: baseVersion + 1, updated_at: new Date().toISOString() })\n  .eq(\"id\", id)\n  .eq(\"version\", baseVersion)\n```\n\nThe last line is what does the work. Only a row whose stored version still equals the one the editor took when it opened the post gets updated. If another screen saved in between, the number has already moved on, nothing matches, and zero rows are updated. The check and the write happen in one statement, so no other request can slip between them.\n\nZero updated rows has two possible causes: the post was deleted, or the version diverged. So the current version is read once more to tell them apart, and a conflict returns 409 along with the current version number."
    },
    "keyInsight": {
      "ko": "동시 수정은 드물게 일어난다. 드문 일을 막기 위해 항상 잠그면 잠금을 관리하는 비용이 상시로 발생한다.\n\n충돌을 미리 막는 대신 일어났을 때 확실히 감지하는 편이 낫다. 감지에 필요한 것은 숫자 하나이고 저장 조건 한 줄로 끝난다. 중요한 것은 충돌을 없애는 것이 아니라 **조용히 덮어쓰이지 않는 것**이다.",
      "en": "Simultaneous edits are rare. Locking all the time to prevent a rare event means paying the cost of managing locks all the time.\n\nDetecting a conflict when it happens beats preventing it in advance. Detection needs one number and one line in the save condition. The goal was never to eliminate conflicts, only to make sure nothing is overwritten in silence."
    },
    "section": {
      "ko": "데이터 / 정합성",
      "en": "Data & Integrity"
    },
    "difficulty": 3,
    "vizKey": "optimistic-lock"
  },
  {
    "id": "scheduled-jobs-run-inside-the-database",
    "problem": {
      "ko": "예약 발행과 휴지통 정리를 호스팅 cron 으로 돌릴 것인가, 데이터베이스 안에서 돌릴 것인가",
      "en": "Run scheduled publishing and trash cleanup on hosting cron, or inside the database?"
    },
    "title": {
      "ko": "정기 작업은 데이터가 있는 곳에서 돌린다",
      "en": "Run scheduled work where the data lives"
    },
    "definition": {
      "ko": "사람이 조작하지 않아도 정해진 시각에 돌아야 하는 작업이 둘 있다.\n\n하나는 예약 발행이다. 글을 쓸 때 공개 시각을 미리 지정해 두면, 그 시각이 지났을 때 누군가 글을 공개 상태로 바꿔 줘야 한다.\n\n다른 하나는 휴지통 정리다. 지운 글은 보관 기한이 지나면 실제로 삭제되는데, 기한을 넘긴 행이 있는지 주기적으로 확인할 무언가가 필요하다.\n\n둘 다 **관리자가 화면을 열고 있지 않을 때도** 돌아야 한다.",
      "en": "Two jobs have to run at fixed times without anyone operating them.\n\nThe first is scheduled publishing. A post can be given a future publish time, and once that time passes something has to flip it to public.\n\nThe second is trash cleanup. Deleted rows are removed for real once their retention deadline passes, which means something has to check periodically whether any row is past it.\n\nBoth have to run when no admin has a screen open."
    },
    "cause": {
      "ko": "두 가지를 검토했다.\n\n호스팅 서비스가 제공하는 cron 이 있다. 설정 파일에 주기를 적어 두면 플랫폼이 그 시각에 정해진 주소를 호출한다. 이 방식은 작업을 실행하기 위한 주소를 인터넷에 열어 둬야 한다. 그 주소를 아는 사람이 아무 때나 호출할 수 있으므로 **비밀키로 따로 막아야 한다**. 처음에는 이 방식으로 만들었고 주기는 5분이었다.\n\n`pg_cron` 은 데이터베이스 안에서 함수를 직접 실행한다. 주소를 열 필요가 없고, 작업이 다루는 데이터와 실행 주체가 같은 곳에 있다. 대신 확장 기능을 켜야 하고, 실행 주기가 저장소의 코드가 아니라 데이터베이스에 등록된다. 어떤 주기로 도는지 확인하려면 데이터베이스를 봐야 한다.",
      "en": "Two options were on the table.\n\nHosting platforms provide cron. A schedule in a config file makes the platform call a fixed URL at that time. This requires exposing a URL on the internet whose only job is to run the task, which then has to be guarded by a secret since anyone who learns the address can call it. The first version worked this way, on a five-minute schedule.\n\n`pg_cron` runs the function inside the database. No URL is exposed, and the job runs where the data it touches already is. In exchange, an extension has to be enabled, and the schedule lives in the database rather than in the repository, so checking how often something runs means looking at the database."
    },
    "solution": {
      "ko": "이 두 작업이 건드리는 대상은 **전부 데이터베이스 안에** 있다. HTTP cron 은 그 안의 일을 시키려고 밖에 입구를 하나 열고, 그 입구를 비밀키로 지키는 코드까지 함께 관리해야 한다. 실행 주체를 데이터가 있는 곳으로 옮기면 **입구도 그 코드도 필요 없어진다**.\n\n두 작업을 `pg_cron` 으로 옮기고 설정 파일의 주기는 비웠다.\n\n```sql\nSELECT cron.schedule(\n  'publish-scheduled',\n  '* * * * *',\n  $cron$ SELECT safe_publish_scheduled(); $cron$\n);\n```\n\n가운데 줄이 실행 주기다. 별표 다섯 개는 매분을 뜻한다. 5분에서 1분으로 줄인 이유는 발행 시각을 분 단위로 지정하기 때문이다. 5분 간격으로 확인하면 지정한 시각보다 최대 5분 늦게 공개된다.\n\n실행 대상은 작업 함수 자체가 아니라 `safe_` 로 감싼 함수다. 안쪽에서 예외가 나면 잡아서 `admin_notifications` 에 오류 내용을 기록한다.\n\n등록 구문도 먼저 `unschedule` 한 뒤 다시 `schedule` 하는 형태로 적어 두었다. 설정 파일 전체를 다시 실행해도 같은 작업이 두 번 등록되지 않는다.\n\n나중에 방문 기록의 IP 를 90일 뒤 익명화하는 작업이 생겼을 때도 같은 방식으로 `anonymize_old_site_visits()` 를 하나 더 등록했다. 새 주소도 비밀키도 필요 없었다.",
      "en": "Everything these two jobs touch **already lives inside the database**. HTTP cron opens a door on the outside just to trigger work on the inside, and then adds guarding code to maintain alongside it. Moving the runner to where the data is **removes both the door and that code**.\n\nBoth jobs moved to `pg_cron`, and the schedule list in the config file was emptied.\n\n```sql\nSELECT cron.schedule(\n  'publish-scheduled',\n  '* * * * *',\n  $cron$ SELECT safe_publish_scheduled(); $cron$\n);\n```\n\nThe middle line is the schedule; five asterisks mean every minute. It went from five minutes to one because publish times are chosen to the minute, and checking every five could leave a post up to five minutes late.\n\nWhat the schedule runs is not the job function but a `safe_` wrapper around it. If the inner call raises, the wrapper catches it and records the error in `admin_notifications`.\n\nThe registration statements `unschedule` before they `schedule`, so re-running the whole setup file never registers the same job twice.\n\nWhen a job to anonymize visit IPs after 90 days was added later, `anonymize_old_site_visits()` was registered the same way. It needed no new endpoint and no secret."
    },
    "keyInsight": {
      "ko": "정기 작업을 HTTP 로 호출하는 구조는 작업을 실행하기 위한 입구를 인터넷에 하나 더 여는 일이다. 그 입구는 지켜야 하고, 지키는 코드도 관리 대상이 된다.\n\n작업이 다루는 대상이 전부 데이터베이스 안에 있다면 실행도 그 안에서 하는 편이 단순하다. 입구가 없으면 지킬 것도 없다.",
      "en": "Driving a scheduled job over HTTP means opening one more door on the internet whose only purpose is to run that job. The door has to be guarded, and the guarding code becomes something else to maintain.\n\nIf everything the job touches is already inside the database, running it there is simpler. A door that does not exist needs no guard."
    },
    "section": {
      "ko": "인프라 / 자동화",
      "en": "Infrastructure & Automation"
    },
    "difficulty": 2,
    "vizKey": "db-cron"
  },
  {
    "id": "two-sources-need-a-rule-for-which-one-wins",
    "problem": {
      "ko": "같은 내용을 파일과 데이터베이스 양쪽에서 고칠 수 있을 때 어느 쪽을 남길 것인가",
      "en": "When the same content can be edited both as a file and in the database, which one survives"
    },
    "title": {
      "ko": "원본이 둘일 때 무엇을 남길지 정해 둔다",
      "en": "Decide up front which source wins"
    },
    "definition": {
      "ko": "이 사이트의 소개 페이지는 글이 길고 이미지가 많다. 처음에는 관리자 화면에서만 고칠 수 있었다. 화면을 열고, 항목을 찾고, 칸을 눌러 고치는 방식이다. 긴 글을 쓰기에는 불편하고, 무엇이 언제 바뀌었는지도 남지 않는다.\n\n글은 편집기에서 쓰고 버전 관리에 올리는 편이 낫다. 그래서 마크다운 파일로도 쓸 수 있게 했다. `content/about/` 아래에 패널별로 파일을 두고, 명령 한 번으로 데이터베이스에 반영한다. 게시물과 작업물이 이미 같은 방식을 쓰고 있었다.\n\n문제는 이때부터 **같은 내용을 고칠 수 있는 곳이 둘**이 된다는 점이다. 파일에서도 고칠 수 있고 관리자 화면에서도 고칠 수 있다. 둘이 달라졌을 때 무엇을 남길지 정해야 한다.",
      "en": "The About page on this site is long and image-heavy. At first it could only be edited through the admin screen: open the page, find the item, click a field, type. That is awkward for long prose, and it leaves no record of what changed when.\n\nProse is better written in an editor and kept under version control. So it became possible to author the same content as markdown. Files live under `content/about/`, one folder per panel, and a single command applies them to the database. Posts and works already worked this way.\n\nThe moment that shipped, **the same content had two places it could be changed**: the file and the admin screen. When they disagree, something has to decide which one survives."
    },
    "cause": {
      "ko": "첫 번째 방법은 사람이 고르게 하는 것이다. 패널마다 \"이 패널은 파일에서 가져온다\" 또는 \"화면에서 편집한다\" 를 설정으로 둔다. 규칙이 단순하고 예측 가능하다.\n\n대신 고를 때마다 판단이 필요하고, 잘못 고르면 방금 쓴 내용이 안 보인다. 파일 쪽으로 맞춰 뒀는데 화면에서 급히 오타를 고치면 그 수정은 반영되지 않는다. 반대로 화면 쪽으로 맞춰 두면 파일에 쓴 긴 글이 무시된다. 설정을 잘못 둔 것과 내용을 잘못 쓴 것을 구분하기 어렵다.\n\n두 번째 방법은 항상 파일을 우선하는 것이다. 파일이 유일한 원본이고 화면 편집은 임시로 본다. 규칙은 가장 단순하지만 화면 편집이 사실상 못 쓰는 기능이 된다. 배포된 서버에서는 저장소 파일을 고칠 수 없으므로, 급한 수정을 할 방법이 사라진다.\n\n세 번째 방법은 더 최근에 손댄 쪽을 남기는 것이다. 파일의 수정 시각과 그 패널의 마지막 화면 편집 시각을 비교해서, 파일이 나중이면 파일을 반영하고 아니면 넘어간다.",
      "en": "The first option is to let a person choose. Each panel carries a setting — \"this panel comes from files\" or \"this panel is edited in the app.\" The rule is simple and predictable.\n\nBut it demands a judgement every time, and a wrong choice makes freshly written content invisible. Set a panel to files, then fix a typo in the app, and the fix is discarded. Set it to the app, and a long piece written in a file is ignored. A misconfigured source is hard to tell apart from badly written content.\n\nThe second option is to always prefer the file. The file is the single source and in-app editing is treated as temporary. That is the simplest rule, but it makes in-app editing effectively unusable: on a deployed server the repository files cannot be changed, so there is no way to make an urgent correction.\n\nThe third option is to keep whichever was touched more recently — compare the file's modification time against that panel's last in-app edit, and apply the file only when it is newer."
    },
    "solution": {
      "ko": "세 번째를 택했다. 게시물과 작업물 동기화가 이미 같은 규칙을 쓰고 있어서, 새 개념을 하나 더 만들지 않아도 된다는 점이 컸다.\n\n```ts\n/* 원본을 사람이 고르지는 않는다. 화면 편집과 md 가 같은 자리에 쓰되, 동기화가 **더 최근에\n * 손댄 쪽**을 남긴다 — 파일 수정 시각이 그 패널의 마지막 화면 편집보다 나중일 때만 쓴다. */\n```\n\n읽을 때의 순서도 함께 정했다. 데이터베이스에 값이 있으면 그것을 쓰고, 비어 있으면 빌드 시점에 마크다운에서 만들어 둔 값을 쓴다. 둘 다 없으면 빈 칸을 보여준다. 사용자가 아직 아무것도 쓰지 않았다는 뜻이므로 그것이 정확한 표현이다.\n\n모든 패널을 마크다운으로 옮기지는 않았다. 관계도와 흐름도는 노드 위치와 연결 정보라서, 마크다운으로 적으면 지금 있는 시각 편집기보다 다루기 나빠진다. 이 셋은 화면 전용으로 남겼다.\n\n동기화 명령은 실제로 쓰기 전에 무엇이 바뀌는지 보여주고, 경고가 하나라도 있으면 쓰지 않고 멈춘다. 형식이 어긋난 파일이 조용히 반영되어 페이지가 비는 상황을 막기 위해서다.",
      "en": "The third. The deciding factor was that post and work sync already used the same rule, so it introduced no new concept.\n\n```ts\n/* Nobody picks the source. Both the app and markdown write to the same place; the sync keeps\n * **whichever was touched more recently** — a file is applied only when its mtime is newer\n * than that panel's last in-app edit. */\n```\n\nThe read order was settled at the same time. If the database holds a value, use it; if it is empty, fall back to the values baked from markdown at build time; with neither, render empty. An empty panel is the accurate representation of \"nothing has been written yet.\"\n\nNot every panel moved to markdown. The ER diagram and the flow diagrams are node positions and connections; expressing them as markdown would be worse to work with than the visual editor that already exists. Those three stayed UI-only.\n\nThe sync command shows what will change before writing anything, and refuses to write if there is even one warning. That keeps a malformed file from being applied silently and leaving the page blank."
    },
    "keyInsight": {
      "ko": "원본이 둘이 되는 순간, 어느 쪽이 이기는지를 **사람의 판단이 아니라 규칙**으로 정해 두어야 한다.\n\n사람에게 고르게 하면 그 선택 자체가 새로운 실수 지점이 된다. 시각을 비교하는 규칙은 판단을 요구하지 않는다. 방금 고친 쪽이 남는다는 것은 설명하지 않아도 예상되는 동작이고, 그래서 잘못 쓸 여지가 적다.",
      "en": "The moment there are two sources, which one wins has to be settled by **a rule, not by a person's judgement**.\n\nAsking someone to choose turns the choice itself into a new place to be wrong. Comparing timestamps demands no judgement. \"The one you just edited survives\" is the behaviour a reader expects without being told, which is exactly why it is hard to get wrong."
    },
    "section": {
      "ko": "인프라 / 자동화",
      "en": "Infrastructure & Automation"
    },
    "difficulty": 2
  }
];

export const aboutSecurity: CfgSecurity[] = [
  {
    "icon": "db",
    "title_ko": "SQL Injection 방지",
    "title_en": "SQL Injection Prevention",
    "description_ko": "모든 DB 쿼리에 Supabase **파라미터화 쿼리**(prepared statements)를 사용합니다. 사용자 입력이 쿼리 문자열에 직접 삽입되지 않아 SQL Injection 공격을 원천 차단합니다.",
    "description_en": "All database queries use Supabase **parameterized queries** (prepared statements). User input is never directly interpolated into query strings, blocking SQL injection attacks at the source.",
    "scope_ko": "모든 DB 쿼리",
    "scope_en": "All DB queries"
  },
  {
    "icon": "shield",
    "title_ko": "XSS 방지",
    "title_en": "XSS Prevention",
    "description_ko": "React JSX가 모든 사용자 입력을 **자동 이스케이프**합니다. `dangerouslySetInnerHTML`을 사용하지 않으며, 서버 측에서 **HTML 태그 스트리핑**과 **제어문자 제거**를 추가로 적용합니다.",
    "description_en": "React JSX **auto-escapes** all user input. No `dangerouslySetInnerHTML` is used. Server-side **HTML tag stripping** and **control character removal** provide additional defense.",
    "scope_ko": "모든 사용자 입력 렌더링",
    "scope_en": "All user input rendering"
  },
  {
    "icon": "check",
    "title_ko": "입력 검증",
    "title_en": "Input Validation",
    "description_ko": "모든 공개 API 엔드포인트에서 **UUID 포맷 검증**, **길이 제한**(content 2000자, password 72B, email 254자, nickname 50자), **이메일 포맷 검증**, **enum 타입 검증**, **카테고리 화이트리스트 검증**을 수행합니다.",
    "description_en": "All public API endpoints enforce **UUID format validation**, **length limits** (content 2000 chars, password 72B, email 254 chars, nickname 50 chars), **email format validation**, **enum type checks**, and **category whitelist validation**.",
    "scope_ko": "모든 공개 API",
    "scope_en": "All public APIs"
  },
  {
    "icon": "lock",
    "title_ko": "단일 경로 인증",
    "title_en": "Single-path Authentication",
    "description_ko": "익명 댓글의 수정/삭제는 **bcrypt**(salt round 10) 비밀번호 **한 경로로만** 인증합니다. 브라우저 UUID 기반 `commenter_hash` 로도 통과시키던 경로는 제거했습니다. 31비트 비암호 해시라 위변조가 가능했고, 아바타 표시를 위해 공개 응답에 포함되는 값이기 때문입니다. 관리자는 **Supabase Auth** 세션으로 인증합니다.",
    "description_en": "Editing or deleting an anonymous comment authenticates through **one path only**: a **bcrypt** (salt round 10) password. The path that also accepted a browser UUID-based `commenter_hash` was removed, because that value is a 31-bit non-cryptographic hash and is returned in the public response so avatars can be drawn. Admins authenticate with a **Supabase Auth** session.",
    "scope_ko": "댓글 수정/삭제, 관리자",
    "scope_en": "Comment edit/delete, Admin"
  },
  {
    "icon": "rows",
    "title_ko": "Row Level Security",
    "title_en": "Row Level Security",
    "description_ko": "Supabase **RLS 정책**으로 테이블별 접근 권한을 DB 레벨에서 제어합니다. 서버 API를 우회하더라도 인증되지 않은 데이터 접근이 불가능합니다.",
    "description_en": "Supabase **RLS policies** control table-level access at the database layer. Unauthorized data access is impossible even if server APIs are bypassed.",
    "scope_ko": "모든 테이블",
    "scope_en": "All tables"
  },
  {
    "icon": "route",
    "title_ko": "경로 보호",
    "title_en": "Route Protection",
    "description_ko": "Layout 레벨에서 **Supabase Auth 세션**을 확인합니다. 미인증 시 접근 거부 페이지로 리다이렉트되며, 로그인 URL을 외부에 노출하지 않습니다.",
    "description_en": "**Supabase Auth session** is verified at the layout level. Unauthenticated requests redirect to an access denied page. Login URL is not exposed externally.",
    "scope_ko": "/admin/* 전체",
    "scope_en": "All /admin/* routes"
  },
  {
    "icon": "fingerprint",
    "title_ko": "중복 방지 · IP 최소 보관",
    "title_en": "Duplication Prevention · Minimal IP Retention",
    "description_ko": "좋아요는 `(대상, IP)`, 투표는 `(투표, 선택지, IP)`, 조회는 `(대상, IP, 날짜)`, 방문은 `(IP, 날짜)` **UNIQUE 인덱스**로 DB 에서 중복을 막습니다. 원문 IP 는 응답에 싣지 않고 가려서 보여주며, 방문·조회 기록의 IP 는 90일 뒤 익명화합니다.",
    "description_en": "**UNIQUE indexes** block duplicates in the database: `(target, IP)` for likes, `(poll, option, IP)` for poll votes, `(target, IP, date)` for views, and `(IP, date)` for visits. Raw IPs never leave the server and are shown masked, and IPs in visit and view records are anonymized after 90 days.",
    "scope_ko": "좋아요, 조회수, 방문 통계",
    "scope_en": "Likes, views, visit stats"
  },
  {
    "icon": "key",
    "title_ko": "시크릿 관리",
    "title_en": "Secrets Management",
    "description_ko": "API 키는 DB `site_settings`에 **암호화 저장**되며, `SUPABASE_SERVICE_ROLE_KEY`는 서버 사이드에서만 접근 가능합니다. 클라이언트에 노출되는 키는 `NEXT_PUBLIC_` 접두사만 허용합니다.",
    "description_en": "API keys are stored **encrypted** in DB `site_settings`. `SUPABASE_SERVICE_ROLE_KEY` is accessible only server-side. Only `NEXT_PUBLIC_` prefixed keys are exposed to the client.",
    "scope_ko": "환경변수, API 키",
    "scope_en": "Env vars, API keys"
  }
];

export const aboutFeatures: CfgFeature[] = [
  {
    "icon": "01",
    "title": "Infinite Scroll Loop",
    "description_ko": "홈 페이지 끝에서 처음으로 끊김 없이 돌아갑니다. 마지막과 첫 섹션 사이의 Bridge 섹션이 이음새를 가리고, 터치에서도 같은 방식으로 감깁니다.",
    "description_en": "The home page wraps from its end back to the start without a break. A Bridge section between the last and first sections hides the seam, and it wraps the same way on touch.",
    "tech": "Lenis, syncTouch, Bridge Section",
    "image": "/images/screenshots/pc/home-dark.png"
  },
  {
    "icon": "02",
    "title": "i18n Bilingual System",
    "description_ko": "한국어·영어를 즉시 전환하고, 글·작업물·프로필도 두 언어로 저장합니다. 자동 번역은 DeepL·Google·Gemini·Claude·OpenAI 를 설정한 순서대로 시도합니다.",
    "description_en": "Korean and English switch instantly, and posts, works, and profiles are stored in both languages. Auto-translation tries DeepL, Google, Gemini, Claude, and OpenAI in the configured order.",
    "tech": "Context API, JSON Locale, Bilingual Content, DeepL/Google/Gemini/Claude/OpenAI",
    "image": "/images/screenshots/pc/feat-i18n.png"
  },
  {
    "icon": "03",
    "title": "Performance Optimization",
    "description_ko": "운영 사이트 데스크톱 Lighthouse 기준 성능 97 · 접근성 100 · SEO 100 입니다(3회 측정 중앙값). LCP 0.7초, TBT 20ms, CLS 0.",
    "description_en": "The live site scores 97 performance, 100 accessibility, and 100 SEO on desktop Lighthouse (median of 3 runs). LCP 0.7s, TBT 20ms, CLS 0.",
    "tech": "Font Subsetting, Lazy Loading, font-display, browserslist",
    "image": "https://rqebkijkxkvsiyhdtvui.supabase.co/storage/v1/object/public/uploads/about/1790517630472.webp"
  },
  {
    "icon": "04",
    "title": "Works Gallery",
    "description_ko": "작업물 페이지 배치를 흐름·전체화면·시네마틱·그리드·분할·원통 6가지 중 설정에서 고릅니다. 흐름은 GSAP 가로 스크롤, 원통은 React Three Fiber 3D 입니다.",
    "description_en": "The works page layout is chosen in settings from six: flow, fullscreen, cinematic, grid, split, and cylinder. Flow is a GSAP horizontal scroll, and cylinder is a React Three Fiber 3D scene.",
    "tech": "GSAP, React Three Fiber, 6 Layouts",
    "image": "/images/screenshots/pc/feat-works.png"
  },
  {
    "icon": "05",
    "title": "Dark / Light Theme",
    "description_ko": "다크·라이트 전환 때 모든 요소가 함께 부드럽게 바뀝니다. 시스템 설정을 따르다가 사용자가 고르면 그 선택을 기억합니다.",
    "description_en": "Switching between dark and light changes every element smoothly together. It follows the system setting until you pick one, then remembers your choice.",
    "tech": "CSS Variables, data-theme, prefers-color-scheme, localStorage",
    "image": "/images/screenshots/pc/feat-colors.png"
  },
  {
    "icon": "06",
    "title": "3D Scroll Torus",
    "description_ko": "스크롤에 맞춰 화면을 떠다니는 금속 질감의 3D 도넛입니다. 리사주 곡선을 따라 움직이고 테마에 따라 질감이 바뀝니다.",
    "description_en": "A metallic 3D torus that floats across the screen with scrolling. It follows a Lissajous curve and its material changes with the theme.",
    "tech": "Three.js, React Three Fiber, Lissajous Curve, Environment Map",
    "image": "/images/screenshots/pc/feat-torus.png"
  },
  {
    "icon": "07",
    "title": "Posts & Series",
    "description_ko": "Plate 리치 텍스트 에디터로 쓰는 블로그입니다. 시리즈 발행, 검색·태그 필터, 커버 이미지(Unsplash·Pexels·AI 생성), 발행 시 Gemini·OpenAI·Claude 한/영 자동 요약을 지원합니다.",
    "description_en": "A blog written in the Plate rich-text editor. It supports series, search and tag filters, cover images (Unsplash, Pexels, AI-generated), and Korean/English AI summaries from Gemini, OpenAI, or Claude on publish.",
    "tech": "Supabase, Plate, Series, AI Cover, AI Summary",
    "image": "/images/screenshots/pc/feat-series.png"
  },
  {
    "icon": "08",
    "title": "Comment & Like System",
    "description_ko": "로그인 없이 쓰는 쓰레드형 댓글입니다. 수정·삭제는 함께 받은 비밀번호로 확인하고, 관리자 답글은 이메일로 알립니다. 댓글에는 이모지 반응 8종을, 글·작업물에는 IP 기준 좋아요를 답니다.",
    "description_en": "Threaded comments that need no login. Edits and deletions are checked against a password given with the comment, and admin replies are sent by email. Comments take 8 emoji reactions, and posts and works take IP-based likes.",
    "tech": "Supabase, Threaded Replies, Emoji Reactions, bcrypt, Email Notify",
    "image": "/images/screenshots/pc/feat-comment.png"
  },
  {
    "icon": "09",
    "title": "Admin CMS",
    "description_ko": "URL 로 직접 들어가는 숨겨진 어드민입니다. 포스트·작업물·프로필을 이중 언어로 관리하고, 테마·폰트·브랜드 설정을 바로 바꿉니다. 트래픽 페이지에서 유입 채널·기기·국가·UTM·재방문 IP 를 봅니다. DB 에 연결되지 않으면 정적 데이터로 돌아갑니다.",
    "description_en": "A hidden admin reached by direct URL. Posts, works, and profiles are managed in two languages, and theme, font, and brand settings change instantly. The traffic page shows referral channels, devices, countries, UTM campaigns, and returning IPs. Without a database it falls back to static data.",
    "tech": "Supabase Auth, Next.js Proxy, JSONB, Static Fallback",
    "image": "/images/screenshots/pc/feat-admin.png"
  }
];

export const aboutProcess: CfgProcess[] = [
  {
    "step": "01",
    "start": "2026-02-05",
    "end": "2026-02-22",
    "commits": "255",
    "prs": "0",
    "weekly": "106 101 48",
    "mix": "feat:82 fix:77 design:27 refactor:32 perf:5 etc:32",
    "metric": "98",
    "metric_label_ko": "모바일 Lighthouse Performance",
    "metric_label_en": "Mobile Lighthouse Performance",
    "title_ko": "공개 사이트 골격",
    "title_en": "Public Site Foundation",
    "description_ko": "홈 등장 애니메이션, 양방향 무한 스크롤과 다이나믹 레이아웃의 **Works**, 연락 서랍(Contact Drawer)을 만들고, **GSAP 가로 스크롤**로 넘기는 About 페이지와 프로필의 3D 토러스, `/design-system` 페이지를 세웠습니다. 쓰지 않는 폰트를 걷어내 모바일 Lighthouse Performance **98점**을 기록했습니다.",
    "description_en": "Built the home intro animation, **Works** with two-way infinite scroll and a dynamic layout, and the Contact Drawer, then set up the About page on **GSAP horizontal scroll**, the 3D torus on the profile, and the `/design-system` page. Removing unused fonts brought mobile Lighthouse Performance to **98**."
  },
  {
    "step": "02",
    "start": "2026-02-23",
    "end": "2026-03-16",
    "commits": "248",
    "prs": "0",
    "weekly": "56 120 72 0",
    "mix": "feat:91 fix:39 design:46 refactor:28 perf:12 etc:32",
    "metric": "−1.7 s",
    "metric_label_ko": "로딩 화면을 줄여 앞당긴 LCP",
    "metric_label_en": "LCP gained by trimming the loading screen",
    "title_ko": "블로그와 관리자 CMS",
    "title_en": "Blog & Admin CMS",
    "description_ko": "카테고리·고정 글·이전/다음 글·시리즈를 갖춘 **블로그**와 이를 관리하는 **관리자 화면**을 만들었습니다. 환경변수를 DB에서 관리하고, 여러 번역 제공자를 쓰는 자동 번역, 알림, 설정 충돌 감지와 비교 창, AI 자동 요약을 붙였습니다. 로딩 화면 대기를 줄여 LCP 를 **1.7초** 앞당겼습니다.",
    "description_en": "Built the **blog** — categories, pinned posts, previous/next navigation, series — and the **admin** to run it. Added database-managed environment variables, automatic translation across several providers, notifications, settings conflict detection with a diff view, and AI summaries. Shortening the loading-screen wait cut LCP by **1.7 s**."
  },
  {
    "step": "03",
    "start": "2026-03-17",
    "end": "2026-04-26",
    "commits": "628",
    "prs": "0",
    "weekly": "189 142 111 91 36 59",
    "mix": "feat:146 fix:211 design:152 refactor:71 perf:3 etc:45",
    "metric": "597 → 139",
    "metric_label_ko": "번역 제공자 로직 줄 수",
    "metric_label_en": "Translation-provider logic, lines",
    "title_ko": "리치 텍스트 에디터",
    "title_en": "Rich Text Editor",
    "description_ko": "**Plate.js** 기반 글 편집기를 만들었습니다. 30초 자동저장과 복원, 이미지 압축, 열 블록, 문서 뷰어, 휴지통(soft delete), **예약 발행**(Vercel cron)을 넣었고, About 의 ERD 를 확대·이동되는 다이어그램으로 새로 그렸습니다. 번역 제공자 로직을 **597줄에서 139줄**로 합쳤습니다.",
    "description_en": "Built the post editor on **Plate.js**, with 30-second autosave and restore, image compression, column blocks, a document viewer, a trash bin (soft delete), and **scheduled publishing** (Vercel cron). Redrew the About ERD as a zoomable, pannable diagram. Merged the translation-provider logic from **597 to 139 lines**."
  },
  {
    "step": "04",
    "start": "2026-04-27",
    "end": "2026-05-27",
    "commits": "405",
    "prs": "127",
    "weekly": "12 53 227 89 24",
    "mix": "feat:67 fix:96 design:54 refactor:57 perf:8 etc:123",
    "metric": "17",
    "metric_label_ko": "릴리스 태그 (v1.0.0 ~ v1.14.0)",
    "metric_label_en": "Release tags (v1.0.0 – v1.14.0)",
    "title_ko": "품질 자동화와 릴리스",
    "title_en": "Tooling & Release Pipeline",
    "description_ko": "lint-staged·stylelint·knip·CI 와 **release-please** 를 들여와, 이때부터 모든 변경을 PR 로 올리고 버전을 매겼습니다(v1.0.0 ~ v1.14.0). 로그인 잠금과 모든 기기 로그아웃 같은 **관리자 보안**을 더하고 **Next.js 16** 으로 옮겼습니다.",
    "description_en": "Brought in lint-staged, stylelint, knip, CI, and **release-please**; from here every change went through a PR and a version (v1.0.0 – v1.14.0). Added **admin security** such as login lockout and sign-out from all devices, and moved to **Next.js 16**."
  },
  {
    "step": "05",
    "start": "2026-05-28",
    "end": "2026-07-22",
    "commits": "122",
    "prs": "70",
    "weekly": "0 23 4 0 16 0 4 75",
    "mix": "feat:29 fix:14 design:21 refactor:2 etc:56",
    "metric": "Markdown",
    "metric_label_ko": "저장 형식을 하나로 통일",
    "metric_label_en": "One storage format for every post",
    "title_ko": "편집기 개편",
    "title_en": "Editor Overhaul",
    "description_ko": "편집기를 Plate 공식 Editor Kit 구성에 맞추고 저장 형식을 **마크다운 하나로** 통일했습니다. 슬래시 메뉴·이모지·목차·mermaid 와 요소별 도구 막대를 붙이고, 미리보기를 실제 글 상세 화면과 **같은 화면**으로 맞췄습니다.",
    "description_en": "Aligned the editor with Plate's official Editor Kit and unified storage on **a single Markdown format**. Added the slash menu, emoji, table of contents, mermaid, and per-element toolbars, and made the preview render **the same view** as the published post."
  },
  {
    "step": "06",
    "start": "2026-07-23",
    "end": "2026-09-10",
    "commits": "470",
    "prs": "310",
    "weekly": "55 162 54 0 12 38 146 3",
    "mix": "feat:47 fix:51 design:42 refactor:155 perf:25 etc:150",
    "metric": "4.8 → 1.0 MB",
    "metric_label_ko": "홈에서 내려받는 양",
    "metric_label_en": "Home page download",
    "title_ko": "전면 리팩토링",
    "title_en": "Full Refactoring",
    "description_ko": "기준선과 **품질 게이트**를 세운 뒤 설정 화면의 거대 컴포넌트를 풀고, 글·작업물·About·편집기를 기능 단위로 나눴습니다. 권한 판정을 DB의 **RLS** 로 옮기고 API 라우트 안전망 테스트 119건을 깔았습니다. 홈에서 내려받는 양을 **4.8 MB 에서 1.0 MB** 로 줄였습니다.",
    "description_en": "Set a baseline and **quality gates**, then broke up the oversized settings components and split posts, works, About, and the editor into feature slices. Moved authorization into database **RLS** and added 119 API route safety-net tests. Cut the home page download from **4.8 MB to 1.0 MB**."
  },
  {
    "step": "07",
    "start": "2026-09-11",
    "end": "2026-09-28",
    "commits": "334",
    "prs": "221",
    "weekly": "166 130 38",
    "mix": "feat:62 fix:127 design:44 refactor:17 perf:39 etc:45",
    "metric": "80 → 96",
    "metric_label_ko": "글 편집기 Lighthouse Accessibility",
    "metric_label_en": "Post editor Lighthouse Accessibility",
    "title_ko": "성능·접근성·운영",
    "title_en": "Performance, Accessibility & Launch",
    "description_ko": "관리자와 공개 화면 문구를 한/영으로 옮기고, 조용히 실패하던 저장을 **알림**으로 드러냈습니다. 포커스 링·모달 포커스 가두기·AA 대비를 정리해 글 편집기 Lighthouse Accessibility 를 **80에서 96** 으로 올렸고, 관리자 글 목록 LCP 를 **2.1초에서 1.45초** 로 줄였습니다.",
    "description_en": "Localized admin and public copy into Korean and English, and surfaced silently failing saves as **notifications**. Focus rings, modal focus traps, and AA contrast raised the post editor's Lighthouse Accessibility from **80 to 96**, and the admin post list LCP dropped from **2.1 s to 1.45 s**."
  }
];

export const aboutOverview: OverviewValues | null = {
  "overview_description_ko": "Claude와 함께 만든 풀스택 포트폴리오. Next.js 16 App Router를 기반으로 GSAP·Framer Motion 애니메이션, Lenis 무한 스크롤, Supabase 블로그까지 직접 설계하고 구현했습니다.",
  "overview_description_en": "A full-stack portfolio built alongside Claude. Designed and implemented from scratch — Next.js 16 App Router, GSAP & Framer Motion animations, Lenis infinite scroll, and a Supabase-powered blog.",
  "overview_highlights": "Next.js 16, GSAP ScrollTrigger, Framer Motion, Lenis Smooth Scroll, Three.js (R3F), CSS Variables, Supabase, i18n (KO/EN), IP-Based Likes, Dark/Light Theme",
  "overview_stats": [
    {
      "value": "7 Mo+",
      "label_ko": "개발 기간\n(2/5 – 지속 업데이트 중)",
      "label_en": "Dev Period\n(Feb 5 – continuously updated)"
    },
    {
      "value": "300+",
      "label_ko": "컴포넌트",
      "label_en": "Components"
    },
    {
      "value": "100+",
      "label_ko": "커스텀 훅",
      "label_en": "Custom Hooks"
    },
    {
      "value": "97",
      "label_ko": "Lighthouse\n(데스크톱 Performance)",
      "label_en": "Lighthouse\n(desktop performance)"
    },
    {
      "value": "2",
      "label_ko": "언어 지원",
      "label_en": "Languages"
    },
    {
      "value": "80+",
      "label_ko": "라이브러리",
      "label_en": "Libraries"
    }
  ]
};

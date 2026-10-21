/* 묶음마다 대표 요청 하나 — API 장면에서 그 묶음에 들어가면 이 요청이 정거장을 차례로 지난다.
   단계는 실제 라우트 코드 순서 그대로(파일 경로가 근거) */
import { journeys, PROXY_STEP, type Journey, type JourneyStep } from "./architecture";

const byKey = (k: string) => journeys.find((j) => j.key === k)!;

/** /api/admin/* 은 프록시에서 출처와 함께 로그인까지 본다(src/proxy.ts 의 관리자 가드) */
const ADMIN_PROXY_STEP: JourneyStep = {
  ...PROXY_STEP,
  title: { ko: "출처 · 관리자 확인", en: "Origin · admin gate" },
  body: { ko: "출처를 보고, /api/admin 은 프록시에서 로그인까지 확인합니다.", en: "Origin is checked, and /api/admin requires a signed-in user already at the proxy." },
  fail: "403 · 401 Unauthorized",
};

const SESSION_STEP: JourneyStep = {
  layer: "auth",
  title: { ko: "로그인 확인", en: "Session" },
  body: { ko: "세션으로 사용자를 확인하고, 역할이 바뀌었으면 토큰을 새로 받습니다.", en: "The session identifies the user; stale role claims trigger a token refresh." },
  fail: "401 UNAUTHORIZED",
  file: "src/lib/api/requireAuth.ts",
};

const OWNER_STEP: JourneyStep = {
  layer: "auth",
  title: { ko: "소유자 확인", en: "Owner only" },
  body: { ko: "로그인한 계정이 사이트 소유자인지 봅니다.", en: "The signed-in account must be the site owner." },
  fail: "401 UNAUTHORIZED · 403 FORBIDDEN_OWNER",
  file: "src/lib/api/requireRole.ts",
};

export const groupJourneys: Record<string, Journey> = {
  posts: byKey("edit"),
  comments: byKey("comment"),
  admin: byKey("settings"),

  works: {
    key: "works",
    label: { ko: "작업물 수정", en: "Edit a work" },
    method: "PATCH",
    path: "/api/works/[id]",
    group: "works",
    steps: [
      { layer: "client", title: { ko: "저장 누름", en: "Save" }, body: { ko: "작업물 편집기가 고친 칸을 보냅니다.", en: "The work editor sends the changed fields." }, file: "src/components/works/WorkEditor.tsx" },
      PROXY_STEP,
      SESSION_STEP,
      { layer: "check", title: { ko: "팀원 확인", en: "Team access" }, body: { ko: "관리자 이상이거나 팀원 목록에 연결된 저자만 고칠 수 있습니다. 판정 조회는 service_role 로 해서 없는 것과 막힌 것을 가립니다.", en: "Only admins or authors linked in the team list may edit. The lookup uses service_role so missing and forbidden stay distinct." }, fail: "404 not found · 403 WORK_TEAM_ONLY", file: "src/lib/api/requirePostAccess.ts" },
      { layer: "check", title: { ko: "허용 칸 · 팀원 연결", en: "Fields · team links" }, body: { ko: "정해 둔 칸만 남깁니다. 팀원에 연결된 계정은 곧 편집 권한이라, 그 연결은 관리자만 바꿀 수 있습니다.", en: "Only whitelisted fields are kept. Linked team accounts grant edit access, so only admins may change them." }, fail: "403 WORK_TEAM_LINK_ADMIN_ONLY", file: "src/app/api/works/[id]/route.ts" },
      { layer: "db", title: { ko: "순서 맞춰 저장", en: "Place and update" }, body: { ko: "순서를 바꿨으면 그 자리에 끼우고 전체를 1..N 으로 다시 매깁니다. 세션 클라이언트로 쓰므로 RLS(can_edit_work)가 한 번 더 막습니다.", en: "A new position is inserted and the list renumbered 1..N in one request. Writes go through the session client, so RLS (can_edit_work) guards it again." }, file: "src/lib/api/placeWork.ts" },
      { layer: "side", title: { ko: "캐시 갱신", en: "Revalidate" }, body: { ko: "작업물 목록 · 상세 · 태그 페이지와, 관련 작업물을 보여 주는 글 상세를 새로 그리게 합니다.", en: "Work list, detail and tag pages are revalidated, plus post details that show related works." }, file: "src/lib/api/revalidateWorks.ts" },
      { layer: "response", title: { ko: "200 OK", en: "200 OK" }, body: { ko: "고친 작업물을 돌려줍니다.", en: "Returns the updated work." }, file: "src/app/api/works/[id]/route.ts" },
    ],
  },

  "admin/authors": {
    key: "admin/authors",
    label: { ko: "저자 초대", en: "Invite an author" },
    method: "POST",
    path: "/api/admin/authors/invite",
    group: "admin/authors",
    steps: [
      { layer: "client", title: { ko: "초대 보내기", en: "Send invite" }, body: { ko: "설정의 저자 목록에서 이메일, 연결할 저자, 권한 레벨을 보냅니다.", en: "The authors list in settings sends an email, the author to link and a permission level." }, file: "src/app/admin/(dashboard)/settings/_components/AuthorsEditor.tsx" },
      ADMIN_PROXY_STEP,
      OWNER_STEP,
      { layer: "check", title: { ko: "입력 검사", en: "Validation" }, body: { ko: "이메일과 저자 id 가 있어야 합니다. 권한 레벨은 정해 둔 값만 받고, 빼면 기본 저자입니다.", en: "Email and author id are required. Only defined permission levels are accepted; omitted means author." }, fail: "400 email and author_id required", file: "src/app/api/admin/authors/invite/route.ts" },
      { layer: "db", title: { ko: "초대 기록", en: "Store invite" }, body: { ko: "author_invites 에 이메일 기준으로 덮어 씁니다. 이미 가입한 계정이면 그 자리에서 권한을 줍니다.", en: "The invite is upserted into author_invites by email. An existing account gets the role right away." }, file: "src/lib/api/authorInvites.ts" },
      { layer: "side", title: { ko: "초대 메일", en: "Invite mail" }, body: { ko: "Resend 로 로그인 링크를 보내고 결과를 서비스 기록에 남깁니다. 키가 없거나 실패해도 초대는 남습니다.", en: "Resend mails the sign-in link and the result is logged. Without a key or on failure, the invite still stands." }, file: "src/app/api/admin/authors/invite/route.ts" },
      { layer: "response", title: { ko: "200 OK", en: "200 OK" }, body: { ko: "바로 적용됐는지와 메일 발송 결과를 돌려줍니다.", en: "Returns whether it applied immediately and whether the mail went out." }, file: "src/app/api/admin/authors/invite/route.ts" },
    ],
  },

  demo: {
    key: "demo",
    label: { ko: "AI 요약 체험", en: "Try AI summary" },
    method: "POST",
    path: "/api/demo/summary",
    group: "demo",
    steps: [
      { layer: "client", title: { ko: "글 붙여 넣기", en: "Paste text" }, body: { ko: "About 의 라이브 데모가 로그인 없이 글을 보냅니다.", en: "The About live demo sends the text, no login needed." }, file: "src/app/about/_components/demos/ai/SummaryDemo.tsx" },
      PROXY_STEP,
      { layer: "check", title: { ko: "입력 검사", en: "Validation" }, body: { ko: "4000자 안인지, 읽을 수 없는 글자나 금지어가 없는지 봅니다.", en: "Up to 4,000 characters, with no unreadable characters or banned words." }, fail: "400 4,000자까지만 받습니다.", file: "src/lib/demo/input.ts" },
      { layer: "check", title: { ko: "기능 켜짐", en: "Feature on" }, body: { ko: "설정에서 AI 요약을 꺼 두었으면 횟수를 쓰기 전에 멈춥니다.", en: "If AI summary is switched off in settings, it stops before using a try." }, fail: "503 지금은 AI 요약 기능을 쓸 수 없습니다.", file: "src/lib/demo/summary.ts" },
      { layer: "db", title: { ko: "하루 상한", en: "Daily quota" }, body: { ko: "IP 를 HMAC 으로 해시한 키로 DB 함수(demo_take)가 한 번을 셉니다. 기본은 IP 마다 3번, 사이트 전체 50번입니다.", en: "A DB function (demo_take) counts one try against an HMAC-hashed IP. By default 3 per IP and 50 site-wide per day." }, fail: "429 오늘 쓸 수 있는 체험 횟수를 모두 썼습니다.", file: "src/lib/demo/quota.ts" },
      { layer: "ext", title: { ko: "공급자 차례로", en: "Provider chain" }, body: { ko: "글 상세 AI 요약과 같은 프롬프트 · 공급자 순서로 부르고, 꺼진 공급자는 건너뜁니다. 결과는 저장하지 않습니다.", en: "Same prompt and provider order as the post AI summary, skipping disabled providers. Nothing is saved." }, file: "src/lib/api/aiSummaryProviders.ts" },
      { layer: "response", title: { ko: "200 · 502", en: "200 · 502" }, body: { ko: "요약과 남은 횟수를 돌려줍니다. 만들지 못하면 쓴 횟수를 되돌립니다.", en: "Returns the summary and tries left; on failure the try is refunded." }, fail: "502 요약하지 못했습니다.", file: "src/lib/demo/handler.ts" },
    ],
  },

  calendars: {
    key: "calendars",
    label: { ko: "달력 만들기", en: "Create a calendar" },
    method: "POST",
    path: "/api/calendars",
    group: "calendars",
    steps: [
      { layer: "client", title: { ko: "달력 블록 추가", en: "Add a block" }, body: { ko: "편집기의 달력 블록이 공유 원본을 새로 만듭니다.", en: "The editor's calendar block creates a new shared source." }, file: "src/components/posts/plate/calendar/calendarApi.ts" },
      PROXY_STEP,
      SESSION_STEP,
      { layer: "check", title: { ko: "본문 읽기", en: "Body" }, body: { ko: "본문을 읽지 못하면 막고, 제목은 문자열 · 데이터는 객체일 때만 씁니다.", en: "Unreadable bodies are rejected; title is used only as a string, data only as an object." }, fail: "400 Invalid body", file: "src/app/api/calendars/route.ts" },
      { layer: "db", title: { ko: "RLS 아래 저장", en: "Insert under RLS" }, body: { ko: "세션 클라이언트로 넣어, 멤버만 쓰게 한 RLS(is_member)를 그대로 받습니다.", en: "Inserted with the session client, so the members-only RLS policy (is_member) applies." }, file: "supabase/migrations/2026_08_22_rls_admin_policies_rest.sql" },
      { layer: "response", title: { ko: "200 OK", en: "200 OK" }, body: { ko: "새 달력 id 를 돌려줍니다. 글의 블록은 이 id 만 참조합니다.", en: "Returns the new calendar id; post blocks reference only this id." }, file: "src/app/api/calendars/route.ts" },
    ],
  },

  revisions: {
    key: "revisions",
    label: { ko: "자동저장", en: "Autosave" },
    method: "POST",
    path: "/api/revisions",
    group: "revisions",
    steps: [
      { layer: "client", title: { ko: "입력 멈춤", en: "Typing pauses" }, body: { ko: "편집기는 입력이 잠시 멈추면 스냅샷을 보내고, 탭을 떠날 때는 sendBeacon 으로 마지막 것을 보냅니다.", en: "The editor sends a snapshot after a pause, and a last one via sendBeacon when the tab is left." }, file: "src/hooks/useEditorAutoSave.ts" },
      PROXY_STEP,
      SESSION_STEP,
      { layer: "check", title: { ko: "필수값", en: "Required" }, body: { ko: "대상 종류 · id · 스냅샷이 모두 있어야 합니다.", en: "Entity type, id and snapshot are all required." }, fail: "400 entity_type, entity_id, snapshot required", file: "src/app/api/revisions/route.ts" },
      { layer: "check", title: { ko: "같으면 건너뜀", en: "Skip duplicates" }, body: { ko: "직전 스냅샷과 같으면 새로 만들지 않고 그 기록을 돌려줍니다.", en: "If it matches the previous snapshot, no new revision is made and the existing one is returned." }, file: "src/app/api/revisions/route.ts" },
      { layer: "db", title: { ko: "저장 · 정리", en: "Insert · trim" }, body: { ko: "새 기록을 넣고, 대상마다 최근 50개만 남기고 지웁니다.", en: "The revision is inserted and only the latest 50 per entity are kept." }, file: "src/app/api/revisions/route.ts" },
      { layer: "response", title: { ko: "200 OK", en: "200 OK" }, body: { ko: "기록 id 와 시각을 돌려줍니다.", en: "Returns the revision id and timestamp." }, file: "src/app/api/revisions/route.ts" },
    ],
  },

  "work-comments": {
    key: "work-comments",
    label: { ko: "작업물 댓글", en: "Comment on a work" },
    method: "POST",
    path: "/api/work-comments",
    group: "work-comments",
    steps: [
      { layer: "client", title: { ko: "익명 작성", en: "Anonymous" }, body: { ko: "작업물 상세의 댓글 칸이 방문자 id 와 비밀번호를 함께 보냅니다.", en: "The work's comment box sends a visitor id along with the password." }, file: "src/components/comments/CommentForm.tsx" },
      PROXY_STEP,
      { layer: "check", title: { ko: "입력 검사", en: "Validation" }, body: { ko: "작업물 id 형식을 보고, 내용을 정리하고, 이메일 · 닉네임 형식과 비밀번호 길이를 봅니다.", en: "The work id format is checked, content sanitized, and email, nickname and password length validated." }, fail: "400 PASSWORD_TOO_SHORT", file: "src/lib/api/commentHandler.ts" },
      { layer: "check", title: { ko: "익명 이름 · 해시", en: "Identity · hash" }, body: { ko: "방문자 id 와 작업물 id 로 익명 이름을 정하고, 비밀번호는 bcrypt 해시로만 남깁니다.", en: "Visitor id plus work id pick an anonymous name; the password is stored only as a bcrypt hash." }, file: "src/utils/commenterIdentity.ts" },
      { layer: "db", title: { ko: "서버만 쓰는 저장", en: "Server-only insert" }, body: { ko: "work_comments 도 공개 읽기 정책을 없애 두어, 서버를 거쳐서만 읽고 씁니다.", en: "work_comments has no public read policy either, so it's read and written only through the server." }, file: "supabase/setup.sql" },
      { layer: "side", title: { ko: "알림 · 메일", en: "Notify · mail" }, body: { ko: "답글이면 원래 댓글 쓴 사람에게 메일을, 관리자에게는 알림을 보냅니다. 응답은 기다리게 하지 않습니다.", en: "Replies email the original commenter and notify the admin, without holding the response." }, file: "src/lib/commenterNotify.ts" },
      { layer: "response", title: { ko: "201 Created", en: "201 Created" }, body: { ko: "비밀번호 해시는 빼고 돌려줍니다.", en: "Returned without the password hash." }, file: "src/lib/api/commentHandler.ts" },
    ],
  },

  "admin/auth": {
    key: "admin/auth",
    label: { ko: "관리자 로그인", en: "Admin sign-in" },
    method: "POST",
    path: "/api/admin/auth",
    group: "admin/auth",
    steps: [
      { layer: "client", title: { ko: "로그인 누름", en: "Sign in" }, body: { ko: "로그인 화면이 이메일과 비밀번호를 보냅니다.", en: "The login page sends email and password." }, file: "src/app/admin/(auth)/login/page.tsx" },
      { ...PROXY_STEP, body: { ko: "출처는 보지만, 로그인 주소는 관리자 가드에서 빠져 있어 로그인 없이 지나갑니다.", en: "Origin is checked, but the login endpoint is exempt from the admin gate." } },
      { layer: "auth", title: { ko: "잠금 확인", en: "Lockout" }, body: { ko: "이 이메일이 잠겨 있으면 인증 전에 막습니다.", en: "A locked email is rejected before authentication." }, fail: "423 locked", file: "src/lib/auth/loginLockout.ts" },
      { layer: "auth", title: { ko: "비밀번호 확인", en: "Password" }, body: { ko: "IP 마다 시도 상한을 둔 뒤 Supabase 로 확인합니다. 틀리면 실패 횟수를 올리고, 5번 이어 틀리면 15분 잠그며 관리자 알림을 남깁니다. 실패 사유는 하나로 돌려줍니다.", en: "After a per-IP cap, Supabase verifies it. Failures are counted; five in a row lock the account for 15 minutes and notify the admin. Every failure returns the same reason." }, fail: "401 · 423 locked · 429", file: "src/app/api/admin/auth/route.ts" },
      { layer: "db", title: { ko: "기기 기록", en: "Device record" }, body: { ko: "admin_known_devices 에 브라우저 · OS · 기기를 남깁니다.", en: "The browser, OS and device are stored in admin_known_devices." }, file: "src/lib/auth/knownDevices.ts" },
      { layer: "side", title: { ko: "새 기기 알림", en: "New-device notice" }, body: { ko: "처음 보는 기기면 알림 메일과 관리자 알림을 남깁니다.", en: "An unknown device triggers a notice mail and an admin notification." }, file: "src/lib/auth/knownDevices.ts" },
      { layer: "response", title: { ko: "200 → 2단계 인증", en: "200 → 2FA" }, body: { ko: "아직 인증 앱 확인 전(aal1) 세션이라, 관리 화면에 들어가면 proxy 가 2단계 인증 화면으로 보냅니다.", en: "The session is still aal1, so the proxy sends the admin to the two-factor screen first." }, file: "src/lib/auth/mfa.ts" },
    ],
  },

  "admin/works": {
    key: "admin/works",
    label: { ko: "관련 글 연결", en: "Link related posts" },
    method: "PUT",
    path: "/api/admin/works/[id]/related-posts",
    group: "admin/works",
    steps: [
      { layer: "client", title: { ko: "작업물 저장", en: "Save the work" }, body: { ko: "편집기가 작업물을 저장한 뒤 관련 글 목록을 따로 보냅니다.", en: "After saving the work, the editor sends the related-post list separately." }, file: "src/components/works/WorkEditor.tsx" },
      ADMIN_PROXY_STEP,
      SESSION_STEP,
      { layer: "check", title: { ko: "편집 권한", en: "Edit access" }, body: { ko: "이 작업물을 고칠 수 있는 사람만 연결도 바꿉니다. 연결 표의 RLS 는 멤버 누구나라서 여기서 막습니다.", en: "Only those who can edit the work may change its links; the link table's RLS allows any member, so this is the gate." }, fail: "404 not found · 403 WORK_TEAM_ONLY", file: "src/lib/api/requirePostAccess.ts" },
      { layer: "db", title: { ko: "통째로 교체", en: "Replace all" }, body: { ko: "기존 연결을 지우고, 문자열 id 만 골라 새로 넣습니다.", en: "Existing links are deleted and only string ids are inserted anew." }, file: "src/app/api/admin/works/[id]/related-posts/route.ts" },
      { layer: "side", title: { ko: "캐시 갱신", en: "Revalidate" }, body: { ko: "글 상세가 관련 작업물을 서버에서 그리므로 글 상세를 새로 그리게 합니다.", en: "Post details render related works on the server, so they're revalidated." }, file: "src/app/api/admin/works/[id]/related-posts/route.ts" },
      { layer: "response", title: { ko: "200 OK", en: "200 OK" }, body: { ko: "저장된 글 id 목록을 돌려줍니다.", en: "Returns the saved post ids." }, file: "src/app/api/admin/works/[id]/related-posts/route.ts" },
    ],
  },

  cover: {
    key: "cover",
    label: { ko: "AI 커버 생성", en: "Generate a cover" },
    method: "POST",
    path: "/api/cover/ai-generate",
    group: "cover",
    steps: [
      { layer: "client", title: { ko: "설명 입력", en: "Describe" }, body: { ko: "커버 고르기 창에서 설명과 화풍을 보냅니다.", en: "The cover picker sends a description and a style." }, file: "src/components/posts/CoverImagePicker/AIGenerateTab.tsx" },
      PROXY_STEP,
      SESSION_STEP,
      { layer: "check", title: { ko: "프롬프트 길이", en: "Prompt length" }, body: { ko: "설명은 500자까지만 받아, 공급자 쪽으로 과한 토큰이 가지 않게 합니다.", en: "Descriptions are capped at 500 characters to avoid token bombs at the provider." }, fail: "400 AI_PROMPT_TOO_LONG", file: "src/app/api/cover/ai-generate/route.ts" },
      { layer: "check", title: { ko: "공급자 순서", en: "Provider order" }, body: { ko: "설정의 기본 공급자(기본 NanoBanana) 다음에 대체 순서를 잇고, 꺼진 공급자는 건너뜁니다.", en: "The configured provider (NanoBanana by default) comes first, then the fallback order, skipping disabled ones." }, file: "src/app/api/cover/ai-generate/route.ts" },
      { layer: "ext", title: { ko: "차례로 생성", en: "Fallback loop" }, body: { ko: "NanoBanana 는 작업을 맡기고 결과를 기다리고, Hugging Face 는 모델이 돌아가는 공급자로 보냅니다. 성공 · 실패는 상태 기록에 남습니다.", en: "NanoBanana is polled for its task; Hugging Face routes to a provider that serves the model. Each outcome is recorded." }, file: "src/lib/ai/health.ts" },
      { layer: "db", title: { ko: "스토리지 저장", en: "Upload" }, body: { ko: "만든 이미지를 posts 버킷에 올리고 공개 주소를 받습니다.", en: "The image is uploaded to the posts bucket and its public URL fetched." }, file: "src/app/api/cover/ai-generate/route.ts" },
      { layer: "response", title: { ko: "200 · 502", en: "200 · 502" }, body: { ko: "이미지 주소와, 앞 공급자가 실패했다면 그 원인을 함께 돌려줍니다.", en: "Returns the image URL, plus why earlier providers failed if any did." }, fail: "502 AI_GENERATE_FAILED · 503 AI_NOT_CONFIGURED", file: "src/app/api/cover/ai-generate/route.ts" },
    ],
  },

  series: {
    key: "series",
    label: { ko: "시리즈 만들기", en: "Create a series" },
    method: "POST",
    path: "/api/series",
    group: "series",
    steps: [
      { layer: "client", title: { ko: "시리즈 추가", en: "Add a series" }, body: { ko: "설정의 시리즈 편집에서 제목을 보냅니다.", en: "The series editor in settings sends a title." }, file: "src/app/admin/(dashboard)/settings/_components/SeriesInlineEditor.tsx" },
      PROXY_STEP,
      SESSION_STEP,
      { layer: "check", title: { ko: "제목 길이", en: "Title length" }, body: { ko: "제목(ko/en)이 80자를 넘으면 막습니다.", en: "Titles (ko/en) over 80 characters are rejected." }, fail: "400 SERIES_TITLE_TOO_LONG", file: "src/app/api/series/route.ts" },
      { layer: "check", title: { ko: "slug · 순서", en: "Slug · order" }, body: { ko: "slug 가 없으면 제목으로 만들고, 순서가 없으면 맨 뒤 번호를 붙입니다.", en: "A missing slug is derived from the title; a missing order goes last." }, file: "src/app/api/series/route.ts" },
      { layer: "db", title: { ko: "저장 · DB CHECK", en: "Save · DB CHECK" }, body: { ko: "세션 클라이언트로 넣어 RLS(is_member)를 받고, 제목 80자 CHECK 가 한 번 더 막습니다.", en: "Inserted through the session client under RLS (is_member), with an 80-character title CHECK as backup." }, file: "supabase/setup.sql" },
      { layer: "response", title: { ko: "201 Created", en: "201 Created" }, body: { ko: "만든 시리즈를 돌려줍니다.", en: "Returns the new series." }, file: "src/app/api/series/route.ts" },
    ],
  },

  "admin/account": {
    key: "admin/account",
    label: { ko: "계정 변경", en: "Change account" },
    method: "PATCH",
    path: "/api/admin/account",
    group: "admin/account",
    steps: [
      { layer: "client", title: { ko: "변경 저장", en: "Save" }, body: { ko: "계정 탭이 현재 비밀번호와 새 이메일 · 비밀번호를 보냅니다.", en: "The account tab sends the current password with the new email or password." }, file: "src/app/admin/(dashboard)/settings/_components/AccountTab.tsx" },
      ADMIN_PROXY_STEP,
      SESSION_STEP,
      { layer: "auth", title: { ko: "로그인 수단", en: "Sign-in method" }, body: { ko: "GitHub 로만 가입한 계정은 비밀번호가 없어, 여기서 바꿀 수 없다고 먼저 알립니다.", en: "GitHub-only accounts have no password, so they're told up front it can't be changed here." }, fail: "400 ACCOUNT_OAUTH_ONLY", file: "src/app/api/admin/account/route.ts" },
      { layer: "auth", title: { ko: "현재 비밀번호", en: "Re-authenticate" }, body: { ko: "세션을 남기지 않는 전용 클라이언트로 다시 로그인해 봅니다. 지금 세션은 그대로입니다.", en: "A non-persisting client signs in again to verify, leaving the current session untouched." }, fail: "400 ACCOUNT_CURRENT_PASSWORD_WRONG", file: "src/app/api/admin/account/route.ts" },
      { layer: "check", title: { ko: "비밀번호 규칙", en: "Password policy" }, body: { ko: "정책이 secure 면 8자 이상에 대소문자 · 숫자 · 특수문자를 모두 요구합니다.", en: "Under the secure policy: 8+ characters with upper, lower, digit and symbol." }, fail: "400 ACCOUNT_PASSWORD_TOO_SHORT · ACCOUNT_PASSWORD_WEAK", file: "src/app/api/admin/account/route.ts" },
      { layer: "db", title: { ko: "계정 갱신", en: "Update user" }, body: { ko: "Supabase Auth 로 바꿉니다. 새 이메일은 확인 메일을 거쳐야 바뀝니다.", en: "Supabase Auth applies it; a new email takes effect only after confirmation." }, fail: "400", file: "src/app/api/admin/account/route.ts" },
      { layer: "side", title: { ko: "보안 메일", en: "Security mail" }, body: { ko: "원래 이메일로 변경 알림을 보내고, 함수가 끝나기 전에 발송을 기다립니다.", en: "A change alert goes to the original email, awaited before the function ends." }, file: "src/app/api/admin/account/route.ts" },
      { layer: "response", title: { ko: "200 OK", en: "200 OK" }, body: { ko: "확인 메일을 보냈는지 함께 돌려줍니다.", en: "Returns whether a confirmation email was sent." }, file: "src/app/api/admin/account/route.ts" },
    ],
  },

  "admin/notifications": {
    key: "admin/notifications",
    label: { ko: "알림 읽음", en: "Mark as read" },
    method: "PATCH",
    path: "/api/admin/notifications",
    group: "admin/notifications",
    steps: [
      { layer: "client", title: { ko: "읽음 표시", en: "Mark read" }, body: { ko: "알림 화면에서 하나 또는 전체를 읽음으로 표시합니다.", en: "The notifications page marks one or all as read." }, file: "src/app/admin/(dashboard)/notifications/page.tsx" },
      ADMIN_PROXY_STEP,
      { layer: "auth", title: { ko: "관리자 등급", en: "Admin level" }, body: { ko: "로그인과 함께 권한 레벨 2(관리자) 이상인지 봅니다.", en: "Requires a session and permission level 2 (admin) or higher." }, fail: "401 UNAUTHORIZED · 403 FORBIDDEN_LEVEL", file: "src/lib/api/requireRole.ts" },
      { layer: "check", title: { ko: "id 목록", en: "Id list" }, body: { ko: "id 는 문자열 배열일 때만 씁니다.", en: "Ids are used only if they form a string array." }, file: "src/app/api/admin/notifications/route.ts" },
      { layer: "db", title: { ko: "RLS 아래 갱신", en: "Update under RLS" }, body: { ko: "세션 클라이언트로 고쳐, 관리자만 쓰게 한 RLS(is_admin)가 한 번 더 막습니다.", en: "Updated through the session client, so the admin-only RLS policy (is_admin) guards it again." }, file: "supabase/migrations/2026_08_22_rls_admin_policies_rest.sql" },
      { layer: "response", title: { ko: "200 OK", en: "200 OK" }, body: { ko: "성공 여부를 돌려줍니다.", en: "Returns success." }, file: "src/app/api/admin/notifications/route.ts" },
    ],
  },

  "admin/secrets": {
    key: "admin/secrets",
    label: { ko: "API 키 저장", en: "Save API keys" },
    method: "PUT",
    path: "/api/admin/secrets",
    group: "admin/secrets",
    steps: [
      { layer: "client", title: { ko: "키 저장", en: "Save keys" }, body: { ko: "설정의 환경 변수 칸이 바꾼 키를 하나 또는 한꺼번에 보냅니다.", en: "The settings key fields send one changed key or all of them." }, file: "src/app/admin/(dashboard)/settings/_components/EnvVarFields.tsx" },
      ADMIN_PROXY_STEP,
      OWNER_STEP,
      { layer: "check", title: { ko: "허용 키만", en: "Allowed keys" }, body: { ko: "편집 가능 목록의 키만 남깁니다. Supabase 키와 CRON_SECRET 은 읽기 전용입니다.", en: "Only editable keys are kept; Supabase keys and CRON_SECRET are read-only." }, fail: "400 Invalid body", file: "src/app/api/admin/secrets/route.ts" },
      { layer: "db", title: { ko: "합쳐 저장", en: "Merge and save" }, body: { ko: "기존 값에 합치고 빈 값은 지운 뒤 site_settings 의 secrets 행에 씁니다.", en: "Merged with existing values, blanks dropped, and written to the secrets row of site_settings." }, file: "src/app/api/admin/secrets/route.ts" },
      { layer: "side", title: { ko: "캐시 · 공급자 초기화", en: "Cache · provider reset" }, body: { ko: "키 캐시를 비우고, 키가 바뀐 공급자는 오류 기록과 차단을 풉니다.", en: "The key cache is cleared, and providers whose key changed get their failures and block reset." }, file: "src/lib/ai/health.ts" },
      { layer: "response", title: { ko: "200 OK", en: "200 OK" }, body: { ko: "성공 여부를 돌려줍니다.", en: "Returns success." }, file: "src/app/api/admin/secrets/route.ts" },
    ],
  },

  etc: {
    key: "etc",
    label: { ko: "조회 기록", en: "Record a page view" },
    method: "POST",
    path: "/api/page-views",
    group: "etc",
    steps: [
      { layer: "client", title: { ko: "주소가 바뀔 때마다", en: "On every route change" }, body: { ko: "사이트 안에서 옮긴 페이지까지 경로 · 세션 · 방문자 id 와 유입 경로 · 쿼리를 보냅니다. 떠날 때는 화면에 보인 시간을 sendBeacon 으로 보냅니다.", en: "Every page, including in-site navigation, sends its path, session and visitor ids, referrer and query. On leave, the visible time goes out via sendBeacon." }, file: "src/components/common/VisitTracker.tsx" },
      PROXY_STEP,
      { layer: "auth", title: { ko: "운영자 제외", en: "Skip the operator" }, body: { ko: "owner · admin 으로 로그인한 본인의 조회는 세지 않습니다. 작성자 · 다른 로그인 사용자는 셉니다.", en: "Views by a signed-in owner or admin aren't counted; authors and other signed-in users are." }, file: "src/app/api/page-views/route.ts" },
      { layer: "check", title: { ko: "제외 IP · 봇", en: "Excluded IP · bots" }, body: { ko: "운영자가 지정한 IP 는 건너뜁니다. 봇은 기기를 bot 으로 남겨 모든 집계에서 뺍니다.", en: "Operator-excluded IPs are skipped; bots are stored with device bot and left out of every count." }, file: "src/app/api/page-views/route.ts" },
      { layer: "db", title: { ko: "30분에 한 번", en: "Once per 30 minutes" }, body: { ko: "같은 IP 가 같은 경로를 30분 안에 다시 보면 앞 조회를 돌려줍니다. 방문의 첫 조회에만 유입 · 기기 · 국가 · UTM 을 담고, 글 · 작업물 경로면 조회수도 올립니다.", en: "A repeat view of the same path by the same IP within 30 minutes returns the earlier view. Only a visit's first view carries referrer, device, country and UTM, and post or project paths bump their view count." }, file: "src/app/api/page-views/route.ts" },
      { layer: "side", title: { ko: "급증 알림", en: "Spike alert" }, body: { ko: "오늘 방문이 15건 이상이고 지난 7일 평균의 3배를 넘으면 하루 한 번 관리자 알림을 만듭니다.", en: "At 15+ visits and 3x the 7-day average, an admin notification is made once a day." }, file: "src/lib/api/dashboardAggregates.ts" },
      { layer: "response", title: { ko: "200 OK", en: "200 OK" }, body: { ko: "기록하지 못해도 방문자 화면을 막지 않도록 200 으로 답합니다. 응답의 조회 id 로 머문 시간을 보냅니다.", en: "Always answers 200, so a failed write never affects the visitor. The returned view id is used to send time on page." }, file: "src/app/api/page-views/route.ts" },
    ],
  },
};

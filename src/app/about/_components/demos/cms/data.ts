/* CMS 데모 여섯 개의 문구와 규칙 상수.
   규칙 숫자는 모두 이 레포의 코드에서 옮겼다 — 바뀌면 옆에 적은 출처부터 고친다. */
import type { L10n } from "../../../_data/showcase";

export type { L10n };

/* ── 자동 저장 ── */

/** 마지막 편집 뒤 이만큼 멈추면 서버 수정본을 남긴다 — hooks/useEditorAutoSave debounceMs 기본값 · PostEditor 의 debounceMs: 3000 */
export const AUTOSAVE_IDLE_MS = 3000;
/** 저장본과 이만큼 이상 달라야 수정본을 남긴다 — hooks/useEditorAutoSave minCharDiff 기본값 */
export const AUTOSAVE_MIN_CHAR_DIFF = 10;
/** 글마다 남기는 수정본 상한 — app/api/revisions/route.ts MAX_REVISIONS */
export const AUTOSAVE_MAX_REVISIONS = 50;

export const autosave = {
  editor: { ko: "편집기", en: "Editor" },
  /** 두 구역의 머리 — 지금 무엇을 보면 되는지 */
  sectionWrite: { ko: "쓰는 동안 — 세 곳에 저장됩니다. 저장된 길의 별이 반짝입니다.", en: "While writing — saved in three places. The star of each save lights up." },
  sectionConflict: { ko: "두 탭이 함께 저장하면 — 버전 숫자로 막습니다. 서버가 앞서면 붉어집니다.", en: "Two tabs saving — the version number stops it. It turns red when the server is ahead." },
  initial: { ko: "자동 저장은 세 겹으로 일어납니다.", en: "Autosave happens in three layers." },
  lanes: {
    local: {
      when: { ko: "즉시", en: "Instantly" },
      what: { ko: "브라우저 저장소", en: "localStorage" },
      note: { ko: "새로고침 · 갑작스러운 종료 대비", en: "For refreshes and crashes" },
    },
    server: {
      when: { ko: "3초 멈춤", en: "3 s idle" },
      what: { ko: "서버 수정본", en: "Server revision" },
      note: { ko: "revisions · 되돌리기용", en: "revisions · restore points" },
    },
    beacon: {
      when: { ko: "페이지 이탈", en: "On leave" },
      what: { ko: "sendBeacon", en: "sendBeacon" },
      note: { ko: "마지막 변경 전송", en: "Sends the last change" },
    },
  },
  count: { ko: "개", en: "" },
  waiting: { ko: "손을 떼면 3초 뒤", en: "3 s after you stop" },
  serverSaved: { ko: "10자 이상 바뀌어 수정본을 남겼습니다.", en: "Ten or more characters changed, so a revision was saved." },
  serverSkipped: { ko: "바뀐 글자가 10자 미만이라 수정본을 남기지 않았습니다.", en: "Fewer than ten characters changed, so no revision was saved." },
  beaconSent: { ko: "떠날 때는 10자 미만이어도 마지막 내용을 보냅니다.", en: "On leave, the last content is sent even under ten characters." },
  beaconNothing: { ko: "마지막 수정본과 같아 보낼 것이 없습니다.", en: "Nothing changed since the last revision, so nothing was sent." },
  opened: { ko: "열 때 받은 버전", en: "Opened at" },
  server: { ko: "서버 버전", en: "Server" },
  otherSave: { ko: "다른 탭에서 저장", en: "Save from another tab" },
  save: { ko: "저장", en: "Save" },
  leave: { ko: "페이지 떠나기", en: "Leave page" },
  overwrite: { ko: "덮어쓰기", en: "Overwrite" },
  reload: { ko: "최신 불러오기", en: "Load latest" },
  hint: {
    ko: "글을 고쳐 보고, 다른 탭에서 먼저 저장한 뒤 저장해 보세요.",
    en: "Edit the text, save from another tab first, then press Save.",
  },
  ok: { ko: "버전이 같아 저장했습니다.", en: "Versions matched, so the post was saved." },
  conflict: {
    ko: "409 version_conflict · 다른 탭이 먼저 저장해 덮어쓰지 않았습니다.",
    en: "409 version_conflict · Another tab saved first, so nothing was overwritten.",
  },
  reloaded: { ko: "최신 버전을 다시 불러왔습니다.", en: "The latest version was reloaded." },
} satisfies Record<string, unknown>;

/* ── 글 한 편의 일생 ── */

/** 휴지통 보관 기간 — app/api/posts/[id]/route.ts DELETE (인기 글은 lib/popularity 점수 상위 5편) */
export const TRASH_DAYS = 30;
export const TRASH_DAYS_POPULAR = 90;
/** 보관 연장 한 번에 늘어나는 날 — app/api/posts/[id]/extend-retention/route.ts */
export const TRASH_EXTEND_DAYS = 30;

export type Stage = "draft" | "scheduled" | "published" | "trash" | "purged";

export const lifecycle = {
  /** 무엇을 보면 되는지 — 단계마다 바뀐 칼럼은 강조색 */
  focus: { ko: "단계를 넘길 때마다 바뀐 posts 칼럼이 강조색으로 표시됩니다.", en: "Each stage highlights the posts columns it changed." },
  stages: [
    { key: "draft", label: { ko: "초안", en: "Draft" } },
    { key: "scheduled", label: { ko: "예약", en: "Scheduled" } },
    { key: "published", label: { ko: "발행", en: "Published" } },
    { key: "trash", label: { ko: "휴지통", en: "Trash" } },
    { key: "purged", label: { ko: "영구 삭제", en: "Purged" } },
  ] as { key: Stage; label: L10n }[],
  title: { ko: "혼자 운영하는 서비스의 설계", en: "Designing a one-person service" },
  gone: { ko: "사라진 글", en: "A deleted post" },
  today9: { ko: "'오늘 09:00'", en: "'today 09:00'" },
  now: { ko: "'방금'", en: "'just now'" },
  daysLater: { ko: "일 뒤", en: " days later" },
  schedule: { ko: "예약하기", en: "Schedule" },
  publishNow: { ko: "바로 발행", en: "Publish now" },
  passSchedule: { ko: "예약 시각 지나기", en: "Pass the scheduled time" },
  editSave: { ko: "고쳐 저장 (버전 +1)", en: "Edit and save (version +1)" },
  remove: { ko: "지우기", en: "Delete" },
  restore: { ko: "복구", en: "Restore" },
  extend: { ko: "30일 연장", en: "Extend 30 days" },
  passDays: { ko: "일 지나기", en: " days pass" },
  popular: { ko: "인기 글 (90일 보관)", en: "Popular post (kept 90 days)" },
  again: { ko: "처음부터", en: "Start over" },
  cronPublish: {
    ko: "pg_cron 이 매분 publish_scheduled() 를 돌려 예약 시각이 지난 글을 발행합니다.",
    en: "pg_cron runs publish_scheduled() every minute and publishes posts past their time.",
  },
  cronPurge: {
    ko: "매일 03:00(KST) purge_trash_scheduled() 가 purge_after 가 지난 글을 지웁니다.",
    en: "Every day at 03:00 KST, purge_trash_scheduled() deletes posts past purge_after.",
  },
  hints: {
    draft: { ko: "예약하거나 바로 발행해 보세요.", en: "Schedule it or publish it now." },
    scheduled: { ko: "published 는 아직 false 이고 scheduled_at 만 채워져 있습니다.", en: "published is still false; only scheduled_at is set." },
    published: { ko: "저장할 때마다 열 때 받은 버전과 비교하고 version 을 1 올립니다.", en: "Each save checks the opened version and bumps version by one." },
    trash: {
      ko: "지우면 published 도 false 가 됩니다. 인기 글은 조회 + 좋아요×3 + 댓글×5 점수 상위 5편입니다.",
      en: "Deleting also sets published to false. Popular means the top five by views + likes×3 + comments×5.",
    },
    restored: {
      ko: "복구는 deleted_at 만 비웁니다. published 는 false 로 남아 초안으로 돌아오고, 남은 purge_after 는 정리 작업이 건너뜁니다.",
      en: "Restore only clears deleted_at. published stays false so it returns as a draft, and the purge job skips the leftover purge_after.",
    },
    purged: { ko: "행이 지워져 되살릴 수 없습니다.", en: "The row is gone and cannot be restored." },
  },
} satisfies Record<string, unknown>;

/* ── 로그인 없는 댓글 ── */

/** 반응 이모지 8종 — utils/commentReactions REACTION_EMOJIS */
export const REACTION_EMOJIS = ["👍", "👎", "😄", "🎉", "😕", "❤️", "🚀", "👀"] as const;
/** 닉네임 재료 일부 — utils/commenterIdentity CREATURES · ADJECTIVES 에서 골랐다(실제는 40종 × 24개) */
export const COMMENT_CREATURES = [
  { emoji: "🦊", noun: "Fox" },
  { emoji: "🐳", noun: "Whale" },
  { emoji: "🦉", noun: "Owl" },
  { emoji: "🐢", noun: "Turtle" },
  { emoji: "🐧", noun: "Penguin" },
  { emoji: "🦔", noun: "Hedgehog" },
  { emoji: "🐙", noun: "Octopus" },
] as const;
export const COMMENT_ADJECTIVES = ["Curious", "Brave", "Gentle", "Clever", "Chill", "Sleepy", "Swift"] as const;
/** 비밀번호 규칙 — utils/commentValidation validatePassword (2자 이상, 72바이트 이하 · bcrypt 한계) */
export const COMMENT_PASSWORD_MIN = 2;
/** 이 데모의 댓글을 쓸 때 정했다고 치는 비밀번호 */
export const COMMENT_DEMO_PASSWORD = "1234";

export const comments = {
  shuffle: { ko: "닉네임 섞기", en: "Shuffle nickname" },
  justNow: { ko: "방금", en: "just now" },
  body: {
    ko: "마크다운도 됩니다. 스크립트는 DOMPurify 가 걸러 냅니다.",
    en: "Markdown works too. DOMPurify strips scripts.",
  },
  tombstone: { ko: "삭제된 댓글입니다.", en: "This comment was deleted." },
  hardDeleted: { ko: "행이 지워져 스레드에 남지 않았습니다.", en: "The row was removed and left nothing in the thread." },
  actor: { ko: "누가 지우나", en: "Who deletes" },
  author: { ko: "작성자", en: "Author" },
  admin: { ko: "관리자", en: "Admin" },
  hasReplies: { ko: "답글이 달려 있음", en: "Has replies" },
  password: { ko: "비밀번호", en: "Password" },
  passwordHint: { ko: "쓸 때 정한 비밀번호는 1234 입니다.", en: "The password set when writing is 1234." },
  remove: { ko: "지우기", en: "Delete" },
  restore: { ko: "관리자: 되살리기", en: "Admin: restore" },
  again: { ko: "처음부터", en: "Start over" },
  intro: {
    ko: "고치거나 지우려면 쓸 때 정한 비밀번호가 필요합니다. 서버는 bcrypt 해시와 대조합니다.",
    en: "Editing or deleting needs the password set when writing. The server checks it against a bcrypt hash.",
  },
  wrong: { ko: "403 · 비밀번호가 맞지 않아 지우지 않았습니다.", en: "403 · Wrong password, so nothing was deleted." },
  required: { ko: "401 · 비밀번호를 입력해야 지울 수 있습니다.", en: "401 · Enter the password to delete." },
  selfHard: {
    ko: "답글이 없어 행을 완전히 지웠습니다. 되살릴 수 없습니다.",
    en: "No replies, so the row was deleted outright. It cannot be restored.",
  },
  selfTomb: {
    ko: "답글이 있어 내용을 보존한 채 가렸습니다(deleted_by: self).",
    en: "It has replies, so it was hidden with its content kept (deleted_by: self).",
  },
  adminTomb: {
    ko: "관리자 삭제는 내용을 보존한 채 가립니다(deleted_by: admin). 공개 응답에서는 본문을 비웁니다.",
    en: "Admin deletes hide the comment and keep its content (deleted_by: admin). Public responses blank the body.",
  },
  restored: { ko: "is_deleted 를 되돌려 원문까지 되살렸습니다.", en: "is_deleted was reverted and the original text is back." },
  reactions: {
    ko: "반응은 IP 와 브라우저 정보의 SHA-256 해시로 한 사람을 가립니다.",
    en: "Reactions tell people apart by a SHA-256 hash of IP and user agent.",
  },
} satisfies Record<string, unknown>;

/* ── GitHub 로그인과 초대 ── */

export type Who = "owner" | "member" | "invited" | "stranger";

export const invite = {
  heading: { ko: "GitHub 로 로그인할 사람", en: "Who signs in with GitHub" },
  people: [
    { key: "owner", label: { ko: "소유자", en: "Owner" }, email: "owner@example.com" },
    { key: "member", label: { ko: "기존 저자", en: "Existing author" }, email: "author@example.com" },
    { key: "invited", label: { ko: "초대받은 사람", en: "Invitee" }, email: "writer@example.com" },
    { key: "stranger", label: { ko: "모르는 사람", en: "Stranger" }, email: "someone@example.com" },
  ] as { key: Who; label: L10n; email: string }[],
  /* app/auth/callback/route.ts 가 보는 차례 — getUserRole(isOwner) → role 보유 → author_invites 행 */
  gates: [
    { ko: "소유자인가 (OWNER_EMAIL · app_metadata)", en: "Owner? (OWNER_EMAIL · app_metadata)" },
    { ko: "이미 역할이 있나", en: "Already has a role?" },
    { ko: "초대 행이 있나 (author_invites)", en: "Invite row? (author_invites)" },
  ] as L10n[],
  yes: { ko: "예", en: "Yes" },
  no: { ko: "아니오", en: "No" },
  idle: {
    ko: "로그인할 사람을 골라 보세요. /auth/callback 이 세 가지를 차례로 봅니다.",
    en: "Pick who signs in. /auth/callback checks three things in order.",
  },
  checking: { ko: "확인 중", en: "checking" },
  owner: {
    ko: "들어옵니다 · 첫 로그인에 소유자 역할을 app_metadata 에 한 번 못박습니다.",
    en: "Allowed · On first sign-in the owner role is pinned into app_metadata once.",
  },
  member: { ko: "들어옵니다 · 이미 붙은 역할 그대로 들어옵니다.", en: "Allowed · Signs in with the role already attached." },
  invited: {
    ko: "들어옵니다 · 초대에 적힌 author_id 와 permission_level 을 붙이고 consumed_at 을 남깁니다.",
    en: "Allowed · Attaches the invite's author_id and permission_level and sets consumed_at.",
  },
  stranger: {
    ko: "들여보내지 않습니다 · 로그아웃하고 방금 생긴 계정을 지웁니다.",
    en: "Rejected · Signs out and deletes the account that was just created.",
  },
  /* app/api/admin/authors/invite/route.ts sendInviteEmail — 키가 없으면 메일만 건너뛰고 초대 행은 남긴다 */
  mail: {
    ko: "초대는 소유자가 Resend 메일로 보냅니다. 그 주소로 GitHub 로그인을 해야 초대가 쓰입니다.",
    en: "The owner sends invites by Resend mail. The invite applies only when that address signs in with GitHub.",
  },
} satisfies Record<string, unknown>;

/** 사람마다 세 관문의 결과 — 앞 관문을 통과하면 뒤는 보지 않는다 */
export const INVITE_PASSES: Record<Who, boolean[]> = {
  owner: [true, false, false],
  member: [false, true, false],
  invited: [false, false, true],
  stranger: [false, false, false],
};

/* ── 누가 무엇을 ── */

export type Role = "owner" | "admin" | "author" | "visitor";

export const roles = {
  /* lib/api/roles.ts — 관리자는 따로 된 역할이 아니라 저자 + permission_level 2(PERM.ADMIN) */
  list: [
    { key: "owner", label: { ko: "소유자", en: "Owner" } },
    { key: "admin", label: { ko: "관리자", en: "Admin" } },
    { key: "author", label: { ko: "저자", en: "Author" } },
    { key: "visitor", label: { ko: "방문자", en: "Visitor" } },
  ] as { key: Role; label: L10n }[],
  action: { ko: "동작", en: "Action" },
  can: { ko: "할 수 있음", en: "Allowed" },
  cannot: { ko: "할 수 없음", en: "Not allowed" },
  /* 동작마다 할 수 있는 역할과, 그 판정을 지키는 곳 — supabase/setup.sql 의 정책 · API 검사 */
  actions: [
    {
      label: { ko: "공개 글 읽기 · 댓글 · 좋아요", en: "Read public posts · comment · like" },
      roles: ["owner", "admin", "author", "visitor"],
      guard: { ko: "posts_public_read 정책이 발행된 글을 누구에게나 엽니다.", en: "The posts_public_read policy opens published posts to everyone." },
    },
    {
      label: { ko: "자기 글 작성 · 수정 · 삭제", en: "Write, edit, delete own posts" },
      roles: ["owner", "admin", "author"],
      guard: { ko: "RLS 의 can_edit_post(author_ids) 가 JWT 의 author_id 와 대조합니다.", en: "RLS can_edit_post(author_ids) matches the JWT author_id." },
    },
    {
      label: { ko: "모든 글 · 작업물 편집", en: "Edit all posts and works" },
      roles: ["owner", "admin"],
      guard: { ko: "RLS 가 app_metadata 의 permission_level 2 이상만 통과시킵니다.", en: "RLS only lets permission_level 2 or higher through." },
    },
    {
      label: { ko: "댓글 · 신고 중재 · 대시보드", en: "Moderate comments, reports · dashboard" },
      roles: ["owner", "admin"],
      guard: { ko: "API 의 requireRole(PERM.ADMIN) 과 RLS 의 is_admin() 이 함께 봅니다.", en: "API requireRole(PERM.ADMIN) and RLS is_admin() both check." },
    },
    {
      label: { ko: "사이트 설정", en: "Site settings" },
      roles: ["owner"],
      guard: {
        ko: "site_settings 는 소유자 전용 정책이고, 저장 API 는 비소유자에게 자기 저자 프로필만 허용합니다(checkNonOwnerConfig).",
        en: "site_settings has an owner-only policy, and the save API lets non-owners touch only their own author profile (checkNonOwnerConfig).",
      },
    },
    {
      label: { ko: "저자 초대 · 권한 관리", en: "Invite authors · manage roles" },
      roles: ["owner"],
      guard: { ko: "API 의 requireOwner() 와 author_invites 소유자 전용 정책이 막습니다.", en: "API requireOwner() and the owner-only author_invites policy guard it." },
    },
  ] as { label: L10n; roles: Role[]; guard: L10n }[],
  idle: {
    ko: "역할을 고르고, 해 볼 동작을 눌러 보세요. 역할은 사용자가 바꿀 수 없는 app_metadata 에 있습니다.",
    en: "Pick a role, then press an action. Roles live in app_metadata, which users cannot edit.",
  },
  allowed: { ko: "허용", en: "Allowed" },
  denied: { ko: "거부", en: "Denied" },
  adminNote: { ko: "관리자는 저자 + permission_level 2 입니다.", en: "Admin means author + permission_level 2." },
} satisfies Record<string, unknown>;

/* ── 이모지 키친 ── */

/** public/emoji-kitchen 의 조합 수와 이모지 수 (pairs.bin 을 풀어 센 값) */
export const KITCHEN_TOTAL_PAIRS = 147_000;
export const KITCHEN_TOTAL_EMOJIS = 619;
/** 가져올 때 줄이는 크기 — app/api/admin/emoji-kitchen/route.ts SIZE */
export const KITCHEN_IMPORT_SIZE = 128;

export const kitchen = {
  first: { ko: "첫 이모지", en: "First emoji" },
  second: { ko: "둘째 이모지", en: "Second emoji" },
  mixed: { ko: "섞은 결과", en: "Mixed result" },
  none: { ko: "이 둘은 조합이 없습니다.", en: "These two have no combination." },
  broken: { ko: "그림을 불러오지 못했습니다.", en: "The image could not be loaded." },
  caption: {
    ko: "조합 14만 7천 개를 meta.json 과 pairs.bin 으로 줄여 두었습니다. 가져오면 128px WebP 로 줄여 커스텀 이모지로 저장합니다.",
    en: "147,000 combinations are packed into meta.json and pairs.bin. Importing shrinks one to a 128px WebP custom emoji.",
  },
} satisfies Record<string, unknown>;


/* ── 장면 머리 · 탭 — 탭마다 무엇을 보여 주는지 한 줄과, 해 볼 차례(번호) ── */

export const shell = {
  playing: { ko: "자동 재생 중 · 누르면 멈춥니다", en: "Autoplaying · tap to stop" },
  yourTurn: { ko: "직접 해 볼 차례입니다", en: "Your turn to try" },
  replay: { ko: "처음부터", en: "Replay" },
} satisfies Record<string, L10n>;

export interface TabCopy {
  label: L10n;
  title: L10n;
  /** 왜 필요한지 — 이 장치가 막는 문제를 한 줄로 */
  why: L10n;
  /** 무엇을 보여 주는지 한 줄 */
  what: L10n;
  /** 해 볼 차례 — 화면에 ①②③ 으로 */
  steps: L10n[];
}

export const tabs = {
  autosave: {
    label: { ko: "자동 저장", en: "Autosave" },
    title: { ko: "세 겹 자동 저장과 저장 충돌", en: "Three-layer autosave and save conflicts" },
    why: { ko: "새로고침되거나 창이 닫혀도, 두 탭에서 함께 고쳐도 글을 잃지 않게 합니다.", en: "Nothing is lost on a refresh or a closed window, or when two tabs edit at once." },
    what: {
      ko: "쓰는 동안 세 군데에 나눠 저장하고, 두 탭이 함께 저장하면 버전 번호로 덮어쓰기를 막습니다.",
      en: "Edits are saved to three places as you write, and a version number stops two tabs from overwriting each other.",
    },
    steps: [
      { ko: "편집기 칸의 글을 고쳐 보세요. 손을 떼고 3초가 지나면 서버 수정본 줄이 찹니다.", en: "Edit the text. Three seconds after you stop, the server lane fills." },
      { ko: "'다른 탭에서 저장'을 누른 뒤 '저장'을 눌러 보세요.", en: "Press 'Save from another tab', then 'Save'." },
    ],
  },
  lifecycle: {
    label: { ko: "글의 일생", en: "Lifecycle" },
    title: { ko: "초안에서 영구 삭제까지", en: "From draft to purge" },
    why: { ko: "예약 발행과 휴지통 비우기를 사람이 챙기지 않아도 DB 가 제때 처리합니다.", en: "Scheduled publishing and emptying the trash happen on time without anyone doing it by hand." },
    what: {
      ko: "예약 발행과 휴지통 정리는 DB 안의 pg_cron 이 맡습니다. 단계마다 posts 칼럼 값이 바뀝니다.",
      en: "pg_cron inside the database handles scheduled publishing and trash cleanup. Each stage changes the posts columns.",
    },
    steps: [
      { ko: "아래 단추로 다음 단계로 넘겨 보세요.", en: "Use the buttons below to move to the next stage." },
      { ko: "지운 뒤에는 '복구'나 '30일 연장'도 눌러 보세요.", en: "After deleting, try 'Restore' or 'Extend 30 days'." },
    ],
  },
  comments: {
    label: { ko: "익명 댓글", en: "Comments" },
    title: { ko: "로그인 없는 댓글과 지우기 규칙", en: "Comments without sign-in, and how they're deleted" },
    why: { ko: "가입 없이 댓글을 받으면서도, 쓴 사람만 지울 수 있게 합니다.", en: "Comments need no sign-up, yet only the writer can delete them." },
    what: {
      ko: "로그인 없이 쓰고, 쓸 때 정한 비밀번호로만 지웁니다. 답글이 있으면 지워도 자리를 남깁니다.",
      en: "Anyone can comment without signing in, and only the password set when writing can delete it. With replies, a placeholder stays.",
    },
    steps: [
      { ko: "비밀번호 칸에 1234 를 넣고 '지우기'를 눌러 보세요.", en: "Type 1234 as the password and press 'Delete'." },
      { ko: "'답글이 달려 있음'을 켜고 다시 해 보세요.", en: "Turn on 'Has replies' and try again." },
      { ko: "'관리자'로 바꿔 지우고 되살려 보세요.", en: "Switch to 'Admin', delete it and restore it." },
    ],
  },
  invite: {
    label: { ko: "로그인 · 초대", en: "Sign-in · Invites" },
    title: { ko: "GitHub 로그인과 초대", en: "GitHub sign-in and invites" },
    why: { ko: "GitHub 계정만 있다고 아무나 관리자에 들어오지 못하게 합니다.", en: "Having a GitHub account doesn't get just anyone into the admin." },
    what: {
      ko: "GitHub 은 누구인지만 알려 줍니다. 들여보낼지는 서버가 세 가지를 차례로 보고 정합니다.",
      en: "GitHub only says who you are. The server decides whether to let you in by checking three things in order.",
    },
    steps: [
      { ko: "로그인할 사람을 하나 고르세요.", en: "Pick someone to sign in." },
      { ko: "세 관문이 차례로 예 · 아니오로 켜지는 것을 보세요.", en: "Watch the three gates turn yes or no in order." },
    ],
  },
  roles: {
    label: { ko: "권한", en: "Roles" },
    title: { ko: "누가 무엇을 할 수 있나", en: "Who can do what" },
    why: { ko: "단추를 숨기는 데서 그치지 않고, API 와 DB 가 역할 밖의 일을 거절합니다.", en: "Not just hidden buttons — the API and the database refuse what a role can't do." },
    what: {
      ko: "역할은 사용자가 고칠 수 없는 app_metadata 에 있고, API 검사와 DB 정책(RLS)이 그 값을 읽어 막습니다.",
      en: "Roles live in app_metadata, which users cannot edit, and both API checks and database policies (RLS) read it.",
    },
    steps: [
      { ko: "위에서 역할을 고르세요.", en: "Pick a role at the top." },
      { ko: "표의 동작을 눌러 허용인지, 어디서 막는지 보세요.", en: "Press an action in the table to see whether it's allowed and what guards it." },
    ],
  },
  kitchen: {
    label: { ko: "이모지 키친", en: "Emoji Kitchen" },
    title: { ko: "이모지 두 개를 섞기", en: "Mixing two emojis" },
    why: { ko: "14만 7천 개 조합을 작은 파일 두 개로 줄여, 고르는 즉시 섞인 그림을 보여 줍니다.", en: "147,000 combinations packed into two small files, so the mix shows the moment you pick." },
    what: {
      ko: "Gboard 이모지 키친 조합 14만 7천 개를 가볍게 줄여 두고, 고른 조합을 커스텀 이모지로 가져옵니다.",
      en: "147,000 Gboard Emoji Kitchen combinations are packed small, and a picked one is imported as a custom emoji.",
    },
    steps: [
      { ko: "위 줄과 아래 줄에서 이모지를 하나씩 고르세요.", en: "Pick one emoji from the top row and one from the bottom." },
      { ko: "섞인 그림이 옆에 크게 나옵니다(좁은 화면은 아래).", en: "The mixed image appears beside them (below on narrow screens)." },
    ],
  },
} satisfies Record<string, TabCopy>;

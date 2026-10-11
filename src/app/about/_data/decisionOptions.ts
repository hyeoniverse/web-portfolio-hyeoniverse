/* 설계 결정 — 결정마다 검토한 선택지와, 고른 방법의 트레이드오프. 문장은 content/about/decisions/*.md 의 Considerations ·
   Decision · Key Insight 절을 줄여 옮겼다(새로 지은 사실은 없다). 키는 결정 id(aboutDecisions[].id) */
import type { L10n } from "./showcase";

export interface DecisionOption {
  name: L10n;
  /** 한 줄 — 그 선택지의 장점 또는 막히는 점 */
  note: L10n;
  /** 판정 한 마디 — note 를 줄인 것. 별이 그 갈래를 검토할 때 ✕ · ✓ 와 함께 붙는다 */
  verdict: L10n;
  chosen?: boolean;
}

export interface DecisionExtra {
  options: DecisionOption[];
  /** 고른 방법의 대가 — 그리고 어떻게 감당하는지 */
  cost: L10n;
}

export const decisionExtras: Record<string, DecisionExtra> = {
  "role-stored-in-app-metadata": {
    options: [
      {
        name: { ko: "user_metadata", en: "user_metadata" },
        verdict: { ko: "사용자가 고칠 수 있다", en: "Users can edit it" },
        note: { ko: "로그인한 사용자가 updateUser() 로 직접 고칠 수 있어 권한 근거로 믿을 수 없다", en: "A signed-in user can edit it with updateUser(), so it can't back authorization" },
      },
      {
        name: { ko: "app_metadata", en: "app_metadata" },
        verdict: { ko: "서버만 바꾸고, 조회가 늘지 않는다", en: "Server-only, no extra query" },
        note: { ko: "서버의 service-role 로만 바뀌고, getUser() 결과에 함께 실려 조회가 늘지 않는다", en: "Only the server's service role can change it, and it arrives with getUser() — no extra query" },
        chosen: true,
      },
      {
        name: { ko: "별도 권한 테이블", en: "Permissions table" },
        verdict: { ko: "확인마다 조회가 하나 더", en: "One more query per check" },
        note: { ko: "보안 조건은 같지만 권한을 확인할 때마다 조회가 하나 더 붙는다", en: "Same security, but every permission check needs one more query" },
      },
    ],
    cost: {
      ko: "권한은 나중에 바뀔 수 있다. 서버는 세션의 사용자 정보를 믿지 않고 요청마다 getUser() 로 Auth 서버에 다시 확인하고, 관리자 화면 메뉴는 Realtime broadcast 로 새로 그린다.",
      en: "Roles can change later. The server never trusts the session's user object — it re-checks with getUser() on every request — and admin menus refresh via a Realtime broadcast.",
    },
  },
  "authorization-moves-to-code-when-rls-is-bypassed": {
    options: [
      {
        name: { ko: "service-role 로 우회", en: "Bypass with service role" },
        verdict: { ko: "관리자 확인이 코드에서 빠져 있었다", en: "The admin check was missing in code" },
        note: { ko: "규칙을 전부 통과해, 관리자인지 확인할 책임이 API 코드로 넘어온다 — 그 확인이 빠져 있었다", en: "Clears every rule, moving the admin check into API code — and that check was missing" },
      },
      {
        name: { ko: "RLS 규칙에 요청자 역할", en: "Caller role in RLS rules" },
        verdict: { ko: "규칙이 역할을 직접 본다", en: "The rule checks the role itself" },
        note: { ko: "토큰의 역할을 auth.jwt() 로 읽어 \"발행됐거나 관리자이면\" 을 규칙으로 쓴다", en: "Read the token's role via auth.jwt() and write \"published, or caller is admin\" as the rule" },
        chosen: true,
      },
    ],
    cost: {
      ko: "규칙은 요청에 실린 토큰을 보므로, 권한을 낮춰도 그 계정의 토큰이 갱신될 때까지는 이전 권한이 유효하다.",
      en: "Rules read the token on the request, so a lowered role stays in effect until that account's token refreshes.",
    },
  },
  "delete-is-a-reversible-state-change": {
    options: [
      {
        name: { ko: "행을 실제로 지우기", en: "Remove the row" },
        verdict: { ko: "되돌리려면 백업을 통째로 복원", en: "Undo means a full backup restore" },
        note: { ko: "코드는 단순하지만 되돌릴 방법이 백업 통째 복원뿐이다", en: "Simpler code, but the only way back is restoring a whole backup" },
      },
      {
        name: { ko: "지운 시각만 기록(soft delete)", en: "Record a deleted_at (soft delete)" },
        verdict: { ko: "휴지통에서 되살린다", en: "Restorable from the trash" },
        note: { ko: "목록에서만 감추고 데이터는 남아 휴지통에서 되살린다", en: "Hidden from lists, data kept, restorable from the trash" },
        chosen: true,
      },
    ],
    cost: {
      ko: "모든 조회가 지워지지 않은 행만 골라야 하고 지운 행이 쌓인다. 지울 때 보관 기한(purge_after)을 적어 두고 예약 작업이 하루에 한 번 실제로 지운다.",
      en: "Every read must filter out deleted rows, and they pile up. A purge_after deadline is stored on delete, and a daily job removes rows past it.",
    },
  },
  "optimistic-concurrency-with-a-version-counter": {
    options: [
      {
        name: { ko: "잠금", en: "Locking" },
        verdict: { ko: "닫힌 브라우저가 잠금을 남긴다", en: "A closed browser leaves the lock" },
        note: { ko: "확실하지만 브라우저를 그냥 닫으면 잠금이 남아 한동안 아무도 못 고친다", en: "Airtight, but a closed browser leaves the lock behind and nobody can edit for a while" },
      },
      {
        name: { ko: "버전 번호", en: "Version counter" },
        verdict: { ko: "어긋나면 409 로 알린다", en: "A mismatch answers 409" },
        note: { ko: "저장 조건에 버전 일치를 넣고, 어긋나면 409 로 알린다", en: "Save only when the version matches; otherwise answer 409" },
        chosen: true,
      },
    ],
    cost: {
      ko: "충돌이 나면 사용자에게 알리고 어떻게 할지 물어야 한다 — 편집기는 저장 충돌 창에서 다시 불러오기 · 덮어쓰기 · 취소를 고르게 한다.",
      en: "A conflict has to be surfaced with a choice — the editor's save-conflict dialog offers reload, overwrite or cancel.",
    },
  },
  "scheduled-jobs-run-inside-the-database": {
    options: [
      {
        name: { ko: "호스팅 cron", en: "Hosting cron" },
        verdict: { ko: "작업 주소를 열어 둬야 한다", en: "Needs an exposed job URL" },
        note: { ko: "작업용 주소를 인터넷에 열어 두고 비밀키로 따로 막아야 한다", en: "Exposes a URL for the job that then needs its own secret" },
      },
      {
        name: { ko: "pg_cron", en: "pg_cron" },
        verdict: { ko: "열어 둘 주소가 없다", en: "No URL to expose" },
        note: { ko: "데이터베이스 안에서 함수를 직접 실행해 열 주소가 없다", en: "Runs the function inside the database — no URL to expose" },
        chosen: true,
      },
    ],
    cost: {
      ko: "확장 기능을 켜야 하고, 실행 주기가 저장소 코드가 아니라 데이터베이스에 등록된다 — 주기를 확인하려면 데이터베이스를 봐야 한다.",
      en: "An extension must be enabled, and the schedule lives in the database rather than the repo — checking it means looking at the database.",
    },
  },
  "two-sources-need-a-rule-for-which-one-wins": {
    options: [
      {
        name: { ko: "사람이 패널마다 고르기", en: "Pick per panel" },
        verdict: { ko: "잘못 고르면 새 내용이 안 보인다", en: "A wrong pick hides new content" },
        note: { ko: "잘못 고르면 방금 쓴 내용이 안 보이고, 설정 실수와 내용 실수를 구분하기 어렵다", en: "A wrong pick hides fresh content, and a bad setting looks like bad content" },
      },
      {
        name: { ko: "항상 파일 우선", en: "File always wins" },
        verdict: { ko: "배포 서버에서는 급한 수정을 못 한다", en: "No urgent fixes on the server" },
        note: { ko: "배포된 서버에서는 파일을 못 고쳐 급한 수정을 할 방법이 사라진다", en: "Files can't change on the deployed server, so urgent fixes become impossible" },
      },
      {
        name: { ko: "더 최근에 손댄 쪽", en: "Most recent wins" },
        verdict: { ko: "글 · 작업물 동기화와 같은 규칙", en: "Same rule as post and work sync" },
        note: { ko: "파일 수정 시각과 마지막 화면 편집 시각을 비교 — 글 · 작업물 동기화와 같은 규칙", en: "Compare file mtime with the last in-app edit — the same rule post and work sync use" },
        chosen: true,
      },
    ],
    cost: {
      ko: "관계도와 흐름도는 노드 위치 데이터라 마크다운이 더 다루기 나빠 화면 전용으로 남겼다. 동기화는 경고가 하나라도 있으면 쓰지 않고 멈춘다.",
      en: "The relation and flow diagrams are node positions, worse to edit as markdown, so they stay UI-only. The sync stops without writing if there is even one warning.",
    },
  },
};

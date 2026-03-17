import type { TroubleShootingItem, TroubleshootingDiagram, ComparisonTable } from "./types";

export const troubleShootingItems: TroubleShootingItem[] = [
  /* ── Backend / Admin ── */
  {
    problem: { ko: "포스트 실수 삭제 시 복구 불가", en: "Accidental Post Deletion with No Recovery" },
    cause: {
      ko: "초기에는 DELETE 요청이 **DB row를 즉시 영구 삭제**하는 구조였습니다. 작성 중이던 글을 실수로 삭제하면 복구할 방법이 전혀 없었고, 관리자가 직접 DB에 접속해야 하는 상황이 발생했습니다. 단일 관리자 환경이라 '실수할 일 없다'고 생각했지만, **실제로는 UI 오조작이나 의도하지 않은 삭제가 발생**했습니다.",
      en: "Initially, DELETE requests **permanently removed the DB row immediately**. Accidentally deleting a draft left no recovery path — the admin had to access the database directly. In a single-admin environment, 'mistakes won't happen' seemed reasonable, but **UI misclicks and unintended deletions did occur**.",
    },
    solution: {
      ko: "삭제 요청 시 row를 지우지 않고 **`deleted_at` 타임스탬프만 기록**하는 soft delete 패턴을 도입했습니다. 삭제된 글은 휴지통(`?trash=true`)에서 확인할 수 있고, **복원(restore) 시 `published=false`로 복구**되어 자동 재발행을 방지합니다. 영구 삭제(purge)는 별도 API로 분리하여 **의도적인 행위만 허용**합니다.",
      en: "Introduced a soft delete pattern that **records a `deleted_at` timestamp** instead of removing the row. Deleted posts appear in a trash bin (`?trash=true`), and **restoring sets `published=false`** to prevent auto-republishing. Permanent deletion (purge) is a separate API, **only allowing intentional actions**.",
    },
    keyInsight: {
      ko: "삭제는 **'없앤다'가 아니라 '숨긴다'**로 시작해야 합니다. 복구 불가능한 작업은 별도 단계로 분리하고, **기본 삭제는 항상 되돌릴 수 있어야** 합니다.",
      en: "Deletion should start with **'hide' rather than 'remove'**. Irreversible operations should be a separate step, and **default deletion must always be reversible**.",
    },
    comparisons: [
      {
        label: { ko: "삭제 방식 비교", en: "Deletion strategy comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "Hard Delete", en: "Hard Delete" },
          { ko: "Soft Delete (채택)", en: "Soft Delete (adopted)" },
          { ko: "Trash Table", en: "Trash Table" },
        ],
        rows: [
          { cells: [{ ko: "구현 복잡도", en: "Implementation" }, { ko: "매우 낮음", en: "Very low" }, { ko: "낮음", en: "Low" }, { ko: "높음", en: "High" }] },
          { cells: [{ ko: "복구 가능", en: "Recoverable" }, { ko: "✗", en: "✗" }, { ko: "✓", en: "✓" }, { ko: "✓", en: "✓" }] },
          { cells: [{ ko: "쿼리 영향", en: "Query impact" }, { ko: "없음", en: "None" }, { ko: "WHERE 조건 추가", en: "WHERE clause added" }, { ko: "조인 필요", en: "Join needed" }] },
          { cells: [{ ko: "FK 무결성", en: "FK integrity" }, { ko: "CASCADE 필요", en: "CASCADE needed" }, { ko: "유지", en: "Maintained" }, { ko: "깨질 수 있음", en: "Can break" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 복구 불가", en: "✗ No recovery" }, { ko: "✓ 단순 + 안전", en: "✓ Simple + safe" }, { ko: "✗ 과도한 복잡도", en: "✗ Over-complex" }], highlight: true },
        ],
        description: {
          ko: "Trash Table 방식은 삭제된 데이터를 별도 테이블로 이동시키는 방식이지만, **FK 관계가 끊어지고** 복원 시 원래 테이블로 다시 옮겨야 합니다. Soft delete는 같은 테이블에 남아 있으므로 FK가 유지되고, 목록 쿼리에 `WHERE deleted_at IS NULL` 조건만 추가하면 됩니다. **단일 관리자 규모에서는 soft delete가 가장 실용적**입니다.",
          en: "Trash Table moves deleted data to a separate table, but **FK relationships break** and restoration requires moving data back. Soft delete keeps records in the same table, preserving FK integrity — just add `WHERE deleted_at IS NULL` to list queries. **At single-admin scale, soft delete is the most practical choice**.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: { ko: "AI 번역/요약이 provider 장애 시 완전 중단", en: "AI Translation/Summary Completely Down on Provider Outage" },
    cause: {
      ko: "번역과 AI 요약 기능이 **단일 provider(DeepL)에만 의존**하고 있었습니다. provider가 rate limit에 걸리거나 장애가 발생하면, 관리자가 직접 설정을 바꾸기 전까지 **번역·요약 기능이 전부 중단**되었습니다. 포트폴리오 특성상 사용 빈도가 낮아 '장애가 오래 지속될 일은 없다'고 가정했지만, **무료 티어 rate limit은 예상보다 자주 발생**했습니다.",
      en: "Translation and AI summary features **depended on a single provider (DeepL)**. When rate-limited or experiencing outages, **all translation/summary features stopped** until the admin manually changed settings. Low usage was expected to avoid issues, but **free-tier rate limits hit more often than anticipated**.",
    },
    solution: {
      ko: "사이트 설정에서 **primary provider + fallback 우선순위 리스트**를 구성할 수 있도록 변경했습니다. primary가 실패하면 fallback 리스트(DeepL → Gemini → Google → Claude)를 순서대로 시도하여, 하나가 성공하면 즉시 반환합니다. 번역 결과 개수가 입력과 불일치하면 해당 provider를 건너뛰는 **검증 로직**도 추가했습니다. provider별 API 키가 없으면 자동으로 다음으로 넘어갑니다.",
      en: "Changed to a **primary provider + fallback priority list** configurable in site settings. On primary failure, the fallback list (DeepL → Gemini → Google → Claude) is tried in order, returning on first success. Added **validation logic** that skips a provider if translation count doesn't match input count. Providers without API keys are automatically skipped.",
    },
    keyInsight: {
      ko: "외부 API에 의존하는 기능은 **\"이 API가 죽으면 어떻게 되는가?\"를 항상 가정**해야 합니다. 단일 장애점(Single Point of Failure)은 사용 빈도와 관계없이 **반드시 발생**합니다.",
      en: "Features depending on external APIs must always assume **\"what happens when this API goes down?\"**. Single Points of Failure **will occur** regardless of usage frequency.",
    },
    diagrams: [
      {
        title: { ko: "Fallback Provider Chain", en: "Fallback Provider Chain" },
        nodes: [
          { id: "start",    type: "start",    row: 0, col: 0, label: { ko: "번역 요청",         en: "Translation\nRequest" } },
          { id: "primary",  type: "action",   row: 1, col: 0, label: { ko: "Primary\nProvider 시도", en: "Try Primary\nProvider" } },
          { id: "ok1",      type: "decision", row: 2, col: 0, label: { ko: "성공?",             en: "Success?" } },
          { id: "fb",       type: "action",   row: 3, col: 0, label: { ko: "Fallback 리스트\n순차 시도", en: "Try Fallback\nList in Order" } },
          { id: "ok2",      type: "decision", row: 4, col: 0, label: { ko: "성공?",             en: "Success?" } },
          { id: "done",     type: "end",      row: 2, col: 1, label: { ko: "결과 반환 ✓",       en: "Return ✓" } },
          { id: "err",      type: "end",      row: 4, col: 1, label: { ko: "502 에러",          en: "502 Error" } },
        ],
        edges: [
          { from: "start",   to: "primary" },
          { from: "primary", to: "ok1" },
          { from: "ok1",     to: "done",  label: "Yes" },
          { from: "ok1",     to: "fb",    label: "No" },
          { from: "fb",      to: "ok2" },
          { from: "ok2",     to: "done",  label: "Yes" },
          { from: "ok2",     to: "err",   label: "No" },
        ],
      } satisfies TroubleshootingDiagram,
    ],
  },
  {
    problem: { ko: "API 키 변경마다 재배포가 필요", en: "Every API Key Change Requires Redeployment" },
    cause: {
      ko: "모든 API 키를 **`.env` 환경변수에 하드코딩**해 두고 있었습니다. 키를 교체하려면 Vercel 대시보드에서 환경변수를 수정한 뒤 **빌드·배포를 다시 실행**해야 했습니다. AI provider를 여러 개 사용하면서 키가 20개 이상으로 늘어났고, 키 하나 바꾸는 데 **3~5분의 빌드 시간**이 소요되었습니다.",
      en: "All API keys were **hardcoded in `.env` environment variables**. Changing a key required editing Vercel dashboard env vars and **re-running build/deploy**. With multiple AI providers, keys grew to 20+, and changing one took **3-5 minutes of build time**.",
    },
    solution: {
      ko: "API 키를 `site_settings` 테이블의 JSONB에 저장하고, **어드민 UI에서 실시간으로 관리**할 수 있도록 변경했습니다. 서버에서는 **DB 값을 우선 사용하고, 없으면 env로 fallback**하는 2단계 조회를 적용합니다. 60초 TTL 캐시로 매 요청마다 DB를 조회하지 않으며, 키 저장/삭제 시 캐시를 즉시 무효화합니다. 키 조회(GET) 시에는 **앞 3자리 + 뒤 3자리만 노출**하고, 전체 값 확인(POST)에는 **비밀번호 재인증**을 요구합니다.",
      en: "Moved API keys to JSONB in the `site_settings` table, **manageable in real-time via admin UI**. Server uses a **two-tier lookup: DB first, env fallback**. A 60-second TTL cache avoids per-request DB queries, invalidated immediately on key save/delete. GET requests **expose only first 3 + last 3 characters**, and viewing full values (POST) **requires password re-authentication**.",
    },
    keyInsight: {
      ko: "자주 바뀌는 설정(API 키, 기능 토글)은 **DB에 저장하여 재배포 없이 변경**할 수 있어야 합니다. 거의 바뀌지 않는 인프라 설정(DB URL, Auth 시크릿)만 환경변수에 남기면 됩니다. **env는 fallback 역할**로 두면 DB 장애 시에도 기능이 유지됩니다.",
      en: "Frequently changing settings (API keys, feature toggles) should be **stored in DB for change without redeployment**. Only rarely-changed infrastructure settings (DB URL, Auth secrets) belong in env vars. **Env as fallback** ensures features survive DB outages.",
    },
    comparisons: [
      {
        label: { ko: "API 키 저장 방식 비교", en: "API key storage comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "env only", en: "env only" },
          { ko: "DB only", en: "DB only" },
          { ko: "DB + env fallback (채택)", en: "DB + env fallback (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "변경 속도", en: "Change speed" }, { ko: "재배포 필요 (3~5분)", en: "Redeploy (3-5min)" }, { ko: "즉시", en: "Instant" }, { ko: "즉시", en: "Instant" }] },
          { cells: [{ ko: "장애 내성", en: "Fault tolerance" }, { ko: "높음 (빌드에 포함)", en: "High (in build)" }, { ko: "DB 의존", en: "DB-dependent" }, { ko: "높음 (이중 경로)", en: "High (dual path)" }] },
          { cells: [{ ko: "비기술 관리자", en: "Non-tech admin" }, { ko: "✗ (Vercel 접근 필요)", en: "✗ (Vercel access)" }, { ko: "✓ (UI 관리)", en: "✓ (UI managed)" }, { ko: "✓ (UI 관리)", en: "✓ (UI managed)" }] },
          { cells: [{ ko: "초기 설정", en: "Initial setup" }, { ko: "간단", en: "Simple" }, { ko: "DB 마이그레이션", en: "DB migration" }, { ko: "DB + env 양쪽", en: "DB + env both" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 키 20개+ 관리 불편", en: "✗ 20+ keys unwieldy" }, { ko: "△ DB 장애 시 중단", en: "△ Down on DB failure" }, { ko: "✓ 유연 + 안전", en: "✓ Flexible + safe" }], highlight: true },
        ],
        description: {
          ko: "env only는 키가 적을 때는 충분하지만, **20개 이상의 키를 관리하면서 잦은 교체가 필요**해지자 한계가 드러났습니다. DB only는 변경은 편하지만 DB 장애 시 모든 외부 연동이 중단됩니다. **DB + env fallback 방식**은 평소에는 DB에서 즉시 변경하고, DB 장애 시에는 env 값으로 자동 전환되어 **가용성과 편의성을 동시에 확보**합니다.",
          en: "env only works fine with few keys, but **managing 20+ keys with frequent rotation** revealed its limits. DB only makes changes easy but stops all integrations on DB failure. **DB + env fallback** allows instant DB changes normally, with automatic env fallback on DB failure, **achieving both availability and convenience**.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: { ko: "비회원 댓글에서 본인 확인이 번거로움", en: "Tedious Identity Verification for Guest Comments" },
    cause: {
      ko: "초기 댓글 시스템은 **비밀번호만으로 본인 확인**을 처리했습니다. 댓글을 수정하거나 삭제할 때마다 비밀번호를 입력해야 했고, 다른 기기에서 작성한 댓글은 비밀번호를 기억하지 못하면 **본인 글인지 확인조차 불가능**했습니다. 회원가입을 도입하면 해결되지만, 포트폴리오 사이트에서 **가입 허들은 댓글 참여율을 크게 떨어뜨립니다**.",
      en: "The initial comment system used **password-only verification**. Every edit/delete required re-entering the password, and comments from other devices were **impossible to identify** if the password was forgotten. Adding sign-up would solve this, but in a portfolio site, **registration hurdles dramatically reduce comment participation**.",
    },
    solution: {
      ko: "브라우저에 **고유 ID(UUID)를 localStorage에 저장**하고, 이 ID와 대상(포스트/작업물) ID를 조합하여 SHA-256 해싱한 `commenter_hash`를 댓글에 저장합니다. 같은 브라우저에서는 해시 비교로 **비밀번호 입력 없이 자동 인식**됩니다. 다른 기기에서는 기존 **bcrypt password_hash로 검증**합니다. 관리자는 Supabase Auth 세션으로 모든 댓글을 관리할 수 있습니다.",
      en: "A **unique UUID stored in localStorage** is combined with the target (post/work) ID and SHA-256 hashed as `commenter_hash`, saved with the comment. On the same browser, hash comparison enables **automatic recognition without password input**. On different devices, existing **bcrypt password_hash verification** applies. Admins manage all comments via Supabase Auth session.",
    },
    keyInsight: {
      ko: "인증 방식은 '보안 수준'이 아니라 **'사용 맥락'에 맞춰야** 합니다. 같은 브라우저에서는 편의성(자동 인식)을, 다른 기기에서는 보안(비밀번호)을 적용하여, **하나의 시스템에서 두 가지 인증 경로**를 제공합니다.",
      en: "Authentication should match the **'usage context'**, not just 'security level'. Same browser gets convenience (auto-recognition), different devices get security (password) — **two auth paths in one system**.",
    },
    comparisons: [
      {
        label: { ko: "비회원 인증 방식 비교", en: "Guest authentication comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "비밀번호만", en: "Password only" },
          { ko: "쿠키/세션", en: "Cookie/Session" },
          { ko: "Hash 이중 인증 (채택)", en: "Dual Hash Auth (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "같은 브라우저", en: "Same browser" }, { ko: "매번 입력", en: "Enter every time" }, { ko: "자동 인식", en: "Auto-recognized" }, { ko: "자동 인식", en: "Auto-recognized" }] },
          { cells: [{ ko: "다른 기기", en: "Different device" }, { ko: "비밀번호 입력", en: "Enter password" }, { ko: "✗ 인식 불가", en: "✗ Unrecognizable" }, { ko: "비밀번호 입력", en: "Enter password" }] },
          { cells: [{ ko: "개인정보 수집", en: "PII collected" }, { ko: "없음", en: "None" }, { ko: "세션 데이터", en: "Session data" }, { ko: "없음 (해시만)", en: "None (hash only)" }] },
          { cells: [{ ko: "서버 부담", en: "Server load" }, { ko: "bcrypt 비교", en: "bcrypt compare" }, { ko: "세션 저장소", en: "Session store" }, { ko: "SHA-256 비교", en: "SHA-256 compare" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "△ 불편함", en: "△ Inconvenient" }, { ko: "✗ 크로스 디바이스 불가", en: "✗ No cross-device" }, { ko: "✓ 편의 + 보안", en: "✓ Convenience + security" }], highlight: true },
        ],
        description: {
          ko: "쿠키/세션 방식은 같은 브라우저에서는 편리하지만, **다른 기기에서는 본인 확인이 불가능**합니다. 비밀번호만으로는 매번 입력하는 불편함이 있습니다. Hash 이중 인증은 **같은 브라우저에서는 자동(SHA-256), 다른 기기에서는 수동(bcrypt)**으로 동작하여, 두 시나리오를 모두 커버합니다. 해시만 저장하므로 **개인정보 이슈도 없습니다**.",
          en: "Cookie/session is convenient on the same browser but **can't verify identity on other devices**. Password-only requires re-entry every time. Dual hash auth works **automatically (SHA-256) on the same browser, manually (bcrypt) on other devices**, covering both scenarios. Only hashes are stored, so **no PII concerns**.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: { ko: "에디터 자동저장 주기가 너무 잦아 리비전이 의미 없이 누적됨", en: "Auto-save Interval Too Frequent — Revisions Accumulated Meaninglessly" },
    cause: {
      ko: "편집 중 변경사항을 보호하기 위해 **5초 debounce**로 자동저장을 구현했습니다. 그런데 5초는 지나치게 짧은 주기여서, **사소한 편집마다 저장이 트리거**되었습니다. 한 시간 작업하면 리비전이 수십 개 쌓였고 대부분 '단어 하나 추가', '오타 수정' 수준으로, 정작 **되돌아가고 싶은 시점을 찾기가 어려웠습니다**.",
      en: "Auto-save was implemented with a **5-second debounce** to protect edits. But 5 seconds was far too short — **every minor edit triggered a save**. After an hour of writing, dozens of revisions piled up, most just 'added a word' or 'fixed a typo', making it **hard to find the checkpoint you actually wanted**.",
    },
    solution: {
      ko: "다른 서비스들과 비교해 이 프로젝트에 맞는 방식을 정했습니다. diff 방식(변경분만 저장)은 구현이 복잡하고, 단일 사용자·리비전 50개 제한 규모에서는 이득이 없다고 판단해 제외했습니다. 저장 주기를 **30초로 늘리고**, 타이머가 울리기 전에 페이지를 이탈해도 마지막 내용이 날아가지 않도록 **페이지 이탈 시 강제 저장**도 추가했습니다. 이탈 방식에 따라 두 경로로 처리합니다.\n- 브라우저 닫기·새로고침은 `navigator.sendBeacon`\n- Next.js SPA 라우팅은 언마운트 시 `fetch({ keepalive: true })`를 사용합니다.",
      en: "Compared with other services to find the right approach. A diff-based approach (saving only changes) was rejected — too complex, no real benefit at single-user scale with a 50-revision cap. Changed to **30-second debounce** + **forced save on page leave**. Two paths handle leave-saves: `navigator.sendBeacon` for browser close/refresh, and `fetch({ keepalive: true })` in the unmount cleanup for Next.js SPA navigation.",
    },
    keyInsight: {
      ko: "저장이 잦다고 좋은 게 아닙니다. **주기가 짧을수록 저장 기록에 잡음이 쌓여** 정작 필요한 시점을 찾기 어렵습니다. 주기적 저장에만 기대면 마지막 편집이 날아갈 수 있으므로, `beforeunload`와 언마운트 cleanup을 **반드시 함께** 구현해야 합니다.",
      en: "More saves aren't always better. **Shorter intervals increase noise in history**, making it hard to find meaningful checkpoints. Timer-based saves alone can **miss the final edit** on page leave — `beforeunload` and unmount cleanup must be implemented alongside.",
    },
    comparisons: [
      {
        label: { ko: "서비스별 자동저장 방식 비교", en: "Auto-save comparison by service" },
        headers: [
          { ko: "서비스", en: "Service" },
          { ko: "저장 주기", en: "Interval" },
          { ko: "저장 방식", en: "Method" },
          { ko: "비용", en: "Cost" },
        ],
        rows: [
          { cells: [{ ko: "Google Docs", en: "Google Docs" }, { ko: "~초 단위 (서버)", en: "~seconds (server)" }, { ko: "OT diff (변경분만)", en: "OT diff (delta only)" }, { ko: "매우 낮음", en: "Very low" }] },
          { cells: [{ ko: "Notion", en: "Notion" }, { ko: "즉시", en: "Immediate" }, { ko: "patch (변경분만)", en: "Patch (delta only)" }, { ko: "낮음", en: "Low" }] },
          { cells: [{ ko: "WordPress", en: "WordPress" }, { ko: "60초", en: "60s" }, { ko: "전체 스냅샷", en: "Full snapshot" }, { ko: "중간", en: "Medium" }] },
          { cells: [{ ko: "이 프로젝트 (이전)", en: "This project (before)" }, { ko: "5초", en: "5s" }, { ko: "전체 스냅샷", en: "Full snapshot" }, { ko: "⚠ 과다", en: "⚠ Excessive" }] },
          { cells: [{ ko: "이 프로젝트 (현재)", en: "This project (now)" }, { ko: "30초", en: "30s" }, { ko: "전체 스냅샷", en: "Full snapshot" }, { ko: "적절 ✓", en: "Appropriate ✓" }], highlight: true },
        ],
        description: {
          ko: "Google Docs와 Notion이 짧은 주기로도 비용이 낮은 건 **변경분(diff)만 저장**하기 때문입니다. 반면 WordPress처럼 전체 스냅샷을 저장하는 방식은 주기가 길어야 비용이 적절해집니다. 이 프로젝트는 전체 스냅샷 방식을 쓰면서 5초 주기를 유지하고 있었는데, 이는 '짧은 주기 + 큰 저장 단위'가 겹친 구조로 **가장 비효율적인 조합**이었습니다.",
          en: "Google Docs and Notion stay low-cost even at short intervals because they **only save the diff (changes)**. Full-snapshot approaches like WordPress need longer intervals to keep costs reasonable. This project was using full snapshots with a 5-second interval — **the worst of both worlds**: short interval combined with large save size.",
        },
      } satisfies ComparisonTable,
      {
        label: { ko: "Snapshot vs Diff — 전체를 저장할까, 바뀐 부분만 저장할까?", en: "Snapshot vs Diff — save everything, or just what changed?" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "Snapshot (채택)", en: "Snapshot (adopted)" },
          { ko: "Diff (미채택)", en: "Diff (rejected)" },
        ],
        rows: [
          { cells: [{ ko: "구현 복잡도", en: "Implementation" }, { ko: "낮음", en: "Low" }, { ko: "높음", en: "High" }] },
          { cells: [{ ko: "복원 방식", en: "Restore" }, { ko: "즉시 (해당 스냅샷으로)", en: "Instant (apply snapshot)" }, { ko: "전체 재계산 필요", en: "Full replay needed" }] },
          { cells: [{ ko: "저장 용량", en: "Storage" }, { ko: "~50KB × 50개 ≒ 2.5MB", en: "~50KB × 50 ≒ 2.5MB" }, { ko: "작음", en: "Small" }] },
          { cells: [{ ko: "다중 사용자 충돌", en: "Multi-user conflicts" }, { ko: "어려움", en: "Difficult" }, { ko: "적합", en: "Suitable" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✓ 단일 사용자, 소규모", en: "✓ Single-user, small scale" }, { ko: "✗ 복잡도 과다", en: "✗ Over-engineered" }], highlight: true },
        ],
        description: {
          ko: "Diff 방식은 Google Docs처럼 **여러 명이 동시에 편집**하거나 변경 이력이 매우 세밀해야 하는 경우에 빛을 발합니다. 하지만 이 프로젝트는 관리자 혼자 사용하는 단일 사용자 환경이고, 리비전은 최대 50개로 제한되어 있어 전체 저장 용량이 약 2.5MB 수준입니다. diff 방식을 구현하면 복원 시 전체 이력을 재계산해야 하고, 코드 복잡도도 크게 올라갑니다. **이 규모에서는 단순한 스냅샷 방식이 더 실용적**입니다.",
          en: "Diff works best when **multiple people edit simultaneously** or when very granular change tracking is needed — like Google Docs. But this project is single-user, with a 50-revision cap that keeps total storage around 2.5MB. Implementing diff would require replaying the full history on restore, and adds significant code complexity. **At this scale, a simple snapshot approach is more practical**.",
        },
      } satisfies ComparisonTable,
    ],
    diagrams: [
      {
        title: { ko: "주기적 자동저장 (30s debounce)", en: "Periodic Auto-save (30s debounce)" },
        nodes: [
          { id: "start",     type: "start",    row: 0, col: 0, label: { ko: "폼 변경",            en: "Form Change" } },
          { id: "init",      type: "decision", row: 1, col: 0, label: { ko: "초기\n스킵?",         en: "Init\nSkip?" } },
          { id: "initskip",  type: "action",   row: 1, col: 1, label: { ko: "스킵\n(플래그 해제)", en: "Skip\n(reset flag)" } },
          { id: "timer",     type: "action",   row: 2, col: 0, label: { ko: "30s 타이머\n리셋",    en: "Reset 30s\ntimer" } },
          { id: "busy",      type: "decision", row: 3, col: 0, label: { ko: "저장 중 /\n타이틀 없음?", en: "Busy /\nNo title?" } },
          { id: "busyskip",  type: "end",      row: 3, col: 1, label: { ko: "무시",               en: "skip" } },
          { id: "save",      type: "action",   row: 4, col: 0, label: { ko: "saveRevision()\n해시 갱신", en: "saveRevision()\nupdate hash" } },
          { id: "end",       type: "end",      row: 5, col: 0, label: { ko: "DB 저장 ✓",          en: "Saved to DB ✓" } },
        ],
        edges: [
          { from: "start",    to: "init" },
          { from: "init",     to: "initskip", label: "Yes" },
          { from: "init",     to: "timer",    label: "No" },
          { from: "timer",    to: "busy" },
          { from: "busy",     to: "busyskip", label: "Yes" },
          { from: "busy",     to: "save",     label: "No" },
          { from: "save",     to: "end" },
        ],
      } satisfies TroubleshootingDiagram,
      {
        title: { ko: "페이지 이탈 시 강제 저장", en: "Forced Save on Page Leave" },
        nodes: [
          { id: "start",   type: "start",    row: 0, col: 0, label: { ko: "페이지 이탈",              en: "Page Leave" } },
          { id: "changed", type: "decision", row: 1, col: 0, label: { ko: "마지막 저장\n이후 변경?",  en: "Changed\nsince save?" } },
          { id: "skip",    type: "end",      row: 1, col: 1, label: { ko: "무시",                    en: "skip" } },
          { id: "save",    type: "action",   row: 2, col: 0, label: { ko: "sendBeacon /\nfetch keepalive", en: "sendBeacon /\nfetch keepalive" } },
          { id: "end",     type: "end",      row: 3, col: 0, label: { ko: "DB 저장 ✓",               en: "Saved ✓" } },
        ],
        edges: [
          { from: "start",   to: "changed" },
          { from: "changed", to: "skip", label: "No" },
          { from: "changed", to: "save", label: "Yes" },
          { from: "save",    to: "end" },
        ],
      } satisfies TroubleshootingDiagram,
    ],
  },

  /* ── Frontend Performance ── */
  {
    problem: { ko: "reCAPTCHA v3 초기 로드 성능 저하 (LCP 17.1s, TTI 18.2s)", en: "reCAPTCHA v3 Initial Load Performance Degradation (LCP 17.1s, TTI 18.2s)" },
    cause: {
      ko: "공식 문서대로 보안 스크립트(reCAPTCHA)를 앱 시작 시 바로 불러왔더니, 페이지를 열자마자 **784KB짜리 파일이 다운로드**되었습니다. 이 파일이 다른 작업을 막으면서 **페이지가 화면에 표시되기까지 17초**나 걸리게 되었습니다.",
      en: "Following official docs, I loaded the security script (reCAPTCHA) immediately on app start, which caused a **784KB file to download right away**. This blocked other work and pushed the **page display time to 17 seconds**.",
    },
    solution: {
      ko: "보안 스크립트를 처음부터 불러오지 않고, **사용자가 처음 클릭하거나 터치하는 시점**에 불러오도록 변경했습니다. 또한 Google 서버와의 **연결을 미리 준비**해 두어 실제 로드 시 더 빨라지도록 했습니다.",
      en: "Instead of loading the security script upfront, it now loads **when the user first clicks or touches the page**. I also **pre-established the connection** to Google's server so the actual load is faster when needed.",
    },
    keyInsight: {
      ko: "외부 스크립트는 **\"지금 당장 필요한가?\"를 먼저 따져야** 합니다. 당장 안 쓰는 무거운 파일을 처음부터 불러오면, 정작 사용자가 보는 화면이 수 초씩 늦어집니다.",
      en: "Always ask **\"is this needed right now?\"** before loading external scripts. Loading heavy files upfront that aren't immediately needed **delays what the user actually sees** by several seconds.",
    },
  },
  {
    problem: { ko: "mousemove마다 React 리렌더 (60fps 성능 저하)", en: "React Re-render on Every mousemove (60fps Performance Degradation)" },
    cause: {
      ko: "Works 섹션의 마우스 반발 효과가 **mousemove마다 React state를 업데이트**하고 있었습니다. 마우스를 움직일 때마다 **초당 60번의 setState 호출**이 발생하고, 매번 WorksSection 전체(25개 이상의 그리드 아이템)가 **다시 그려졌습니다**. 이로 인해 마우스를 움직이는 동안 메인 스레드가 계속 바빴습니다.",
      en: "The mouse repulsion effect in the Works section was **updating React state on every mousemove**. This caused **~60 setState calls per second**, each triggering a full re-render of WorksSection with 25+ grid items. The main thread stayed busy the entire time the mouse was moving.",
    },
    solution: {
      ko: "React state 대신 **useRef로 오프셋 값을 저장**하고, 별도의 **requestAnimationFrame 루프에서 lerp 보간 후 DOM의 style.transform을 직접 수정**하는 방식으로 변경했습니다. React는 이 변화를 전혀 인지하지 못하므로 **리렌더가 발생하지 않습니다**.",
      en: "Replaced React state with **useRef for offset storage** and a separate **requestAnimationFrame loop that applies lerp-smoothed values directly via style.transform**. React is completely unaware of these changes, so **zero re-renders occur**.",
    },
    keyInsight: {
      ko: "초당 수십 번 변하는 값(마우스 위치, 스크롤 오프셋 등)은 **React state로 관리하면 안 됩니다**. 화면에 반영만 하면 되는 값은 **ref + 직접 DOM 조작**이 훨씬 효율적입니다.",
      en: "Values that change dozens of times per second (mouse position, scroll offsets) **should never be React state**. When you only need visual output, **ref + direct DOM manipulation** is far more efficient.",
    },
  },

  /* ── CSS / Styling ── */
  {
    problem: { ko: "CSS Module 해시 충돌로 데스크톱 레이아웃 붕괴", en: "CSS Module Hash Collision Collapsing Desktop Layout" },
    cause: {
      ko: "About 페이지의 각 패널은 **공유 CSS Module과 로컬 CSS Module을 `{ ...shared, ...local }`로 병합**하여 사용합니다. ProcessPanel의 `.processBody`는 공유 CSS에서 `display: contents`로 정의되어 있었는데, 로컬 CSS에서 **모바일 미디어 쿼리 안에서만** 같은 이름의 클래스를 정의했습니다. 문제는 CSS Module이 **파일별로 다른 해시를 생성**하기 때문에, 스프레드 병합 시 **로컬 해시가 공유 해시를 덮어써** 데스크톱에서 `display: contents`가 적용되지 않은 것이었습니다.",
      en: "About page panels merge shared and local CSS Modules via `{ ...shared, ...local }`. ProcessPanel's `.processBody` was defined as `display: contents` in shared CSS, but local CSS only defined the **same class name inside a mobile media query**. Since CSS Modules generate **different hashes per file**, the spread merge caused the **local hash to override the shared hash**, losing `display: contents` on desktop.",
    },
    solution: {
      ko: "로컬 CSS 파일에 **미디어 쿼리 바깥에서도 `.processBody { display: contents }`를 명시적으로 선언**하여, 로컬 해시가 적용되더라도 데스크톱에서 올바른 스타일이 유지되도록 했습니다.",
      en: "Added an **explicit `.processBody { display: contents }` rule outside the media query** in the local CSS file, ensuring the correct style is maintained on desktop even when the local hash takes over.",
    },
    keyInsight: {
      ko: "`{ ...shared, ...local }` 패턴에서 **같은 클래스명이 양쪽에 존재하면 로컬이 무조건 이깁니다**. 로컬에서 미디어 쿼리 안에서만 정의해도 해시 자체가 달라지므로, **데스크톱 기본 스타일까지 로컬에 복제**해야 합니다.",
      en: "In the `{ ...shared, ...local }` pattern, **if the same class name exists in both, local always wins**. Even defining it only inside a media query changes the hash, so you must **replicate the desktop default style in local CSS** too.",
    },
  },
];

import type { TroubleShootingItem, TroubleshootingDiagram, ComparisonTable } from "./types";

export const troubleShootingItems: TroubleShootingItem[] = [
  /* ── Backend / Admin ── */
  {
    section: { ko: "Backend / Admin", en: "Backend / Admin" },
    problem: { ko: "포스트 실수 삭제 시 복구 불가", en: "Accidental Post Deletion with No Recovery" },
    definition: {
      ko: "관리자가 포스트를 실수로 삭제하면 **DB에서 영구 제거**되어, 복구 수단이 전혀 없었습니다.",
      en: "When the admin accidentally deleted a post, it was **permanently removed from the DB** with no recovery mechanism available.",
    },
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
    definition: {
      ko: "테스트 중 `.env`의 API 키를 주석 처리했더니, 번역·요약을 시도할 때마다 **오류 메시지가 사용자에게 그대로 노출**되었습니다. 대부분의 API를 무료 티어로 사용하고 있어 **rate limit이나 장애가 실제 운영에서도 충분히 발생할 수 있는 상황**이었고, 현재 사용할 수 없는 기능이 사용자에게 그대로 노출되거나, 관리자가 사용하지 않으려는 기능이라도 **API 키가 없으면 오류가 계속 발생**하는 구조였습니다.",
      en: "While testing, I commented out an API key in `.env` — every translation or summary attempt **surfaced error messages directly to users**. Since most APIs were on free tiers, **rate limits and outages were a realistic production concern**. Unavailable features remained visible to users, and even features the admin didn't intend to use **kept throwing errors when no API key was registered**.",
    },
    cause: {
      ko: "여러 provider를 지원하지만 **fallback 없이 하나의 provider만 사용하는 구조**였습니다. provider 장애 시 **자동으로 대체 경로가 없었고**, API 키가 미등록된 기능도 UI에서 숨기거나 비활성화하는 처리가 없어 **사용자가 실패할 수밖에 없는 기능을 계속 시도**할 수 있었습니다.",
      en: "Multiple providers were supported but **each feature used a single provider with no fallback**. There was **no automatic alternative path** on provider failure, and features without registered API keys were neither hidden nor disabled in the UI — **users could keep triggering features that were guaranteed to fail**.",
    },
    solution: {
      ko: "사이트 설정에서 **primary provider + fallback 우선순위 리스트**를 구성할 수 있도록 변경했습니다. primary가 실패하면 fallback 리스트(DeepL → Gemini → Google → Claude)를 순서대로 시도하여, 하나가 성공하면 즉시 반환합니다. 배치 번역 시 5개의 텍스트를 보냈는데 번역 결과가 4개만 돌아오는 경우처럼 **입력 개수와 결과 개수가 맞지 않으면 해당 provider를 불완전한 응답으로 판단하고 건너뛰도록** 검증 로직도 추가했습니다. API 키가 등록되지 않은 provider는 호출 자체를 시도하지 않고 자동으로 다음 provider로 넘어갑니다.",
      en: "Changed to a **primary provider + fallback priority list** configurable in site settings. On primary failure, the fallback list (DeepL → Gemini → Google → Claude) is tried in order, returning on first success. For batch translations, if 5 texts are sent but only 4 results come back, the provider is **treated as returning an incomplete response and skipped** in favor of the next one. Providers without a registered API key are **not called at all** and automatically bypassed.",
    },
    keyInsight: {
      ko: "외부 API에 의존하는 기능은 **\"이 API가 응답하지 않으면 사용자에게 무엇이 보이는가?\"를 항상 가정**해야 합니다. provider가 완전히 죽지 않더라도 rate limit만으로 API 호출이 실패할 수 있고, 그때 **오류를 그대로 노출할지, 기능을 숨길지, 대체 경로를 제공할지**를 미리 정해두어야 합니다.",
      en: "Features depending on external APIs must always assume **\"what will the user see when this API stops responding?\"** Even if the provider isn't completely down, rate limits alone can cause API calls to fail — and you need to decide in advance whether to **expose the error, hide the feature, or provide a fallback path**.",
    },
    diagrams: [
      {
        title: { ko: "Fallback Provider Chain", en: "Fallback Provider Chain" },
        nodes: [
          { id: "start",    type: "start",    row: 0, col: 0, label: { ko: "번역 요청",         en: "Translation\nRequest" } },
          { id: "primary",  type: "action",   row: 1, col: 0, label: { ko: "Primary\nProvider 시도", en: "Try Primary\nProvider" } },
          { id: "ok1",      type: "decision", row: 2, col: 0, label: { ko: "성공?",             en: "Success?" } },
          { id: "fb",       type: "action",   row: 3, col: 0, label: { ko: "Fallback 리스트\n순차 시도", en: "Try Fallback\nList in Order" } },
          { id: "ok2",      type: "decision", row: 4, col: 0, y: 100, label: { ko: "성공?",       en: "Success?" } },
          { id: "done",     type: "end",      row: 2, col: 1, label: { ko: "결과 반환 ✓",       en: "Return ✓" } },
          { id: "err",      type: "end",      row: 4, col: 2, label: { ko: "502 에러",          en: "502 Error" } },
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
    definition: {
      ko: "API 키를 하나 교체하려면 **Vercel 환경변수 수정 → 빌드 → 배포** 전체 과정을 거쳐야 했고, 10개 이상의 키를 이 방식으로 관리해야 했습니다.",
      en: "Changing a single API key required the **full Vercel env edit → build → deploy cycle**, and 10+ keys all had to be managed this way.",
    },
    cause: {
      ko: "모든 API 키를 **`.env` 환경변수에 하드코딩**해 두고 있었습니다. 키를 교체하려면 Vercel 대시보드에서 환경변수를 수정한 뒤 **빌드·배포를 다시 실행**해야 했습니다. AI provider를 여러 개 사용하면서 키가 10개 이상으로 늘어났고, 키 하나 바꾸는 데 **3~5분의 빌드 시간**이 소요되었습니다.",
      en: "All API keys were **hardcoded in `.env` environment variables**. Changing a key required editing Vercel dashboard env vars and **re-running build/deploy**. With multiple AI providers, keys grew to 10+, and changing one took **3-5 minutes of build time**.",
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
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 키 10개+ 관리 불편", en: "✗ 10+ keys unwieldy" }, { ko: "△ DB 장애 시 중단", en: "△ Down on DB failure" }, { ko: "✓ 유연 + 안전", en: "✓ Flexible + safe" }], highlight: true },
        ],
        description: {
          ko: "env only는 키가 적을 때는 충분하지만, **10개 이상의 키를 관리하면서 잦은 교체가 필요**해지자 한계가 드러났습니다. DB only는 변경은 편하지만 DB 장애 시 모든 외부 연동이 중단됩니다. **DB + env fallback 방식**은 평소에는 DB에서 즉시 변경하고, DB 장애 시에는 env 값으로 자동 전환되어 **가용성과 편의성을 동시에 확보**합니다.",
          en: "env only works fine with few keys, but **managing 10+ keys with frequent rotation** revealed its limits. DB only makes changes easy but stops all integrations on DB failure. **DB + env fallback** allows instant DB changes normally, with automatic env fallback on DB failure, **achieving both availability and convenience**.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: { ko: "비회원 댓글에서 본인 확인이 번거로움", en: "Tedious Identity Verification for Guest Comments" },
    definition: {
      ko: "비회원 댓글 수정/삭제 시 **매번 비밀번호를 입력**해야 했고, 다른 기기에서 작성한 댓글은 **본인 확인 자체가 불가능**했습니다.",
      en: "Editing/deleting guest comments required **re-entering the password every time**, and comments from other devices were **completely unidentifiable**.",
    },
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
    definition: {
      ko: "자동저장이 **5초마다 실행**되어 한 시간 작업 시 수십 개의 리비전이 쌓였고, 대부분 의미 없는 변경이라 **되돌아갈 시점을 찾기 어려웠습니다**.",
      en: "Auto-save fired **every 5 seconds**, generating dozens of revisions per hour — most were trivial changes, making it **hard to find meaningful restore points**.",
    },
    cause: {
      ko: "편집 중 변경사항을 보호하기 위해 **5초 debounce**로 자동저장을 구현했습니다. 그런데 5초는 지나치게 짧은 주기여서, **사소한 편집마다 저장이 트리거**되었습니다. 한 시간 작업하면 리비전이 수십 개 쌓였고 대부분 '단어 하나 추가', '오타 수정' 수준으로, 정작 **되돌아가고 싶은 시점을 찾기가 어려웠습니다**.",
      en: "Auto-save was implemented with a **5-second debounce** to protect edits. But 5 seconds was far too short — **every minor edit triggered a save**. After an hour of writing, dozens of revisions piled up, most just 'added a word' or 'fixed a typo', making it **hard to find the checkpoint you actually wanted**.",
    },
    solution: {
      ko: "다른 서비스들과 비교해 이 프로젝트에 맞는 방식을 정했습니다. diff 방식(변경분만 저장)은 구현이 복잡하고, 단일 사용자·리비전 50개 제한 규모에서는 이득이 없다고 판단해 제외했습니다. 저장 주기를 **30초로 늘리고**, 타이머가 울리기 전에 페이지를 이탈해도 마지막 내용이 날아가지 않도록 **페이지 이탈 시 강제 저장**도 추가했습니다. 페이지를 떠나는 방식이 두 가지이므로 각각 다른 API를 사용합니다.\n- **브라우저 닫기·새로고침**: 탭 자체가 사라지면 진행 중인 fetch도 함께 취소되므로, 브라우저에 전송을 위임하는 `navigator.sendBeacon`을 사용합니다.\n- **Next.js SPA 라우팅**: 브라우저 탭은 그대로이고 자바스크립트가 화면을 교체하는 것이라(예: 에디터에서 네비게이션 링크를 눌러 다른 페이지로 이동) `beforeunload`가 발생하지 않습니다. 대신 에디터 컴포넌트의 언마운트 시점에 `fetch({ keepalive: true })`로 전송하면, 컴포넌트가 사라져도 요청이 중단되지 않습니다.\n\n에디터에 다시 진입하면 자동 저장된 초안이 있는지 확인하고, **확인 팝업을 띄워 사용자가 불러올지 무시할지 선택**할 수 있도록 했습니다. 이전에는 자동으로 복원했지만, 의도하지 않은 복원이 오히려 혼란을 줄 수 있어 **명시적 확인 후 복원**으로 변경했습니다.",
      en: "Compared with other services to find the right approach. A diff-based approach (saving only changes) was rejected — too complex, no real benefit at single-user scale with a 50-revision cap. Changed to **30-second debounce** + **forced save on page leave**. Two different APIs handle leave-saves depending on how the user leaves:\n- **Browser close/refresh**: The tab itself is destroyed, canceling any in-flight fetch — `navigator.sendBeacon` delegates the send to the browser so it completes even after the tab is gone.\n- **Next.js SPA routing**: The browser tab stays open — JavaScript swaps the view (e.g., clicking a nav link from the editor to another page), so `beforeunload` never fires. Instead, `fetch({ keepalive: true })` is called during the editor component's unmount cleanup, keeping the request alive even after the component is gone.\n\nWhen re-entering the editor, a **confirmation popup asks whether to restore** the auto-saved draft or discard it. Previously drafts were restored automatically, but this could cause confusion — so it was changed to **explicit confirmation before restore**.",
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

  /* ── Frontend / Performance ── */
  {
    section: { ko: "Frontend / Performance", en: "Frontend / Performance" },
    problem: { ko: "reCAPTCHA v3 초기 로드 성능 저하 (LCP 17.1s, TTI 18.2s)", en: "reCAPTCHA v3 Initial Load Performance Degradation (LCP 17.1s, TTI 18.2s)" },
    definition: {
      ko: "reCAPTCHA 스크립트(784KB)가 페이지 로드 시 즉시 다운로드되어, **LCP 17.1초 / TTI 18.2초**로 초기 렌더링을 심각하게 지연시켰습니다.",
      en: "The reCAPTCHA script (784KB) downloaded immediately on page load, severely delaying initial rendering to **LCP 17.1s / TTI 18.2s**.",
    },
    cause: {
      ko: "공식 문서대로 보안 스크립트(reCAPTCHA)를 앱 시작 시 바로 불러왔더니, 페이지를 열자마자 **784KB짜리 파일이 다운로드**되었습니다. 이 파일이 다른 작업을 막으면서 **페이지가 화면에 표시되기까지 17초**나 걸리게 되었습니다.",
      en: "Following official docs, I loaded the security script (reCAPTCHA) immediately on app start, which caused a **784KB file to download right away**. This blocked other work and pushed the **page display time to 17 seconds**.",
    },
    solution: {
      ko: "보안 스크립트를 처음부터 불러오지 않고, **사용자가 처음 클릭하거나 터치하는 시점**에 불러오도록 변경했습니다. 또한 Google 서버와의 **연결을 미리 준비(preconnect)**해 두어 실제 로드 시 더 빨라지도록 했습니다.",
      en: "Instead of loading the security script upfront, it now loads **when the user first clicks or touches the page**. I also **pre-established the connection (preconnect)** to Google's server so the actual load is faster when needed.",
    },
    keyInsight: {
      ko: "외부 스크립트는 **\"지금 당장 필요한가?\"를 먼저 따져야** 합니다. 당장 안 쓰는 무거운 파일을 처음부터 불러오면, 정작 사용자가 보는 화면이 수 초씩 늦어집니다. reCAPTCHA는 **컨택트 폼에만 적용**하고 댓글에는 넣지 않았는데, 댓글은 이미 비밀번호 + commenter_hash 이중 인증으로 보호되어 **captcha를 추가하면 참여 허들만 높아질 뿐**입니다.",
      en: "Always ask **\"is this needed right now?\"** before loading external scripts. Loading heavy files upfront that aren't immediately needed **delays what the user actually sees** by several seconds. reCAPTCHA is applied **only to the contact form** — comments are already protected by password + commenter_hash dual auth, so adding captcha would **only raise the participation barrier**.",
    },
    comparisons: [
      {
        label: { ko: "외부 스크립트 로딩 전략 비교", en: "External script loading strategy comparison" },
        headers: [
          { ko: "전략", en: "Strategy" },
          { ko: "Eager (즉시)", en: "Eager (immediate)" },
          { ko: "Lazy (뷰포트)", en: "Lazy (viewport)" },
          { ko: "Interaction (채택)", en: "Interaction (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "로드 시점", en: "Load timing" }, { ko: "페이지 로드 즉시", en: "On page load" }, { ko: "요소가 뷰포트 진입", en: "Element enters viewport" }, { ko: "첫 클릭/터치", en: "First click/touch" }] },
          { cells: [{ ko: "초기 성능 영향", en: "Initial perf impact" }, { ko: "⚠ 높음 (784KB 블로킹)", en: "⚠ High (784KB blocking)" }, { ko: "중간", en: "Medium" }, { ko: "없음", en: "None" }] },
          { cells: [{ ko: "사용자 대기", en: "User wait time" }, { ko: "없음 (이미 로드)", en: "None (preloaded)" }, { ko: "짧음", en: "Short" }, { ko: "첫 인터랙션 시 짧은 지연", en: "Brief delay on first interaction" }] },
          { cells: [{ ko: "적합한 경우", en: "Best for" }, { ko: "즉시 필요한 스크립트", en: "Immediately needed scripts" }, { ko: "스크롤 후 필요", en: "Needed after scroll" }, { ko: "사용자 행동 후 필요", en: "Needed after user action" }] },
          { cells: [{ ko: "reCAPTCHA에 적합?", en: "Right for reCAPTCHA?" }, { ko: "✗ LCP 17s 유발", en: "✗ Causes 17s LCP" }, { ko: "△ 컨택트 드로어 열기 전 불필요", en: "△ Unnecessary before contact drawer" }, { ko: "✓ 컨택트 폼 제출 시점에만 필요", en: "✓ Only needed on contact form submit" }], highlight: true },
        ],
        description: {
          ko: "reCAPTCHA는 **컨택트 폼 제출 시에만 필요**합니다. 페이지를 읽기만 하는 대다수 방문자에게는 불필요한 784KB입니다. Lazy 방식은 폼 영역이 뷰포트에 들어올 때 로드하지만, 스크롤만으로 트리거되어 폼을 사용할 의도 없는 사용자에게도 로드됩니다. **Interaction 방식**은 실제 클릭/터치가 발생한 시점에만 로드하므로, **불필요한 로드를 완전히 제거**합니다. preconnect로 DNS/TLS 핸드셰이크를 미리 완료해 두면 실제 로드 시 체감 지연도 최소화됩니다.",
          en: "reCAPTCHA is **only needed when submitting the contact form**. For the majority of visitors who just read, it's an unnecessary 784KB. Lazy loading triggers on viewport entry, loading even for users with no intent to submit a form. **Interaction-based loading** only fires on actual click/touch, **completely eliminating unnecessary loads**. Preconnect completes DNS/TLS handshake early, minimizing perceived delay when actually loaded.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: { ko: "mousemove마다 React 리렌더 (60fps 성능 저하)", en: "React Re-render on Every mousemove (60fps Performance Degradation)" },
    definition: {
      ko: "홈 Works 섹션에서 마우스를 움직이면 원형 아이템들이 밀려나는 반발 효과가 있는데, 반발 오프셋을 `useState`로 관리하면서 mousemove마다 **25개 이상의 그리드 아이템이 통째로 리렌더**되어 마우스를 빠르게 움직일수록 **애니메이션이 버벅거리고 프레임이 끊겼습니다**.",
      en: "The Works section on the home page has a magnetic repulsion effect where circular items push away from the cursor. Repulsion offsets were managed with `useState`, triggering a **full re-render of 25+ grid items on every mousemove** — the faster the mouse moved, the **more visible the stuttering and frame drops** became.",
    },
    cause: {
      ko: "Works 섹션의 마우스 반발 효과가 **mousemove마다 React state를 업데이트**하고 있었습니다. 마우스를 움직일 때마다 **초당 60번의 setState 호출**이 발생하고, 매번 WorksSection 전체(25개 이상의 그리드 아이템)가 **다시 그려졌습니다**. 결과적으로 마우스를 움직이는 내내 **렌더링 작업이 끊임없이 쌓여** 프레임이 밀렸습니다.",
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
    comparisons: [
      {
        label: { ko: "고빈도 업데이트 처리 방식 비교", en: "High-frequency update approach comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "useState", en: "useState" },
          { ko: "useMemo + throttle", en: "useMemo + throttle" },
          { ko: "useRef + RAF (채택)", en: "useRef + RAF (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "리렌더 횟수", en: "Re-renders" }, { ko: "~60/s", en: "~60/s" }, { ko: "~15/s (throttle)", en: "~15/s (throttle)" }, { ko: "0", en: "0" }] },
          { cells: [{ ko: "부드러움", en: "Smoothness" }, { ko: "프레임 드롭", en: "Frame drops" }, { ko: "끊김 있음", en: "Stuttery" }, { ko: "60fps 유지", en: "Smooth 60fps" }] },
          { cells: [{ ko: "React 생태계", en: "React ecosystem" }, { ko: "✓ 일반적", en: "✓ Idiomatic" }, { ko: "✓ 일반적", en: "✓ Idiomatic" }, { ko: "△ 탈출구 패턴", en: "△ Escape hatch" }] },
          { cells: [{ ko: "구현 복잡도", en: "Complexity" }, { ko: "낮음", en: "Low" }, { ko: "중간", en: "Medium" }, { ko: "중간", en: "Medium" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 60fps 불가능", en: "✗ Can't hit 60fps" }, { ko: "△ 끊김 체감됨", en: "△ Stutter noticeable" }, { ko: "✓ 부드러운 시각 효과", en: "✓ Smooth visual effect" }], highlight: true },
        ],
        description: {
          ko: "useState는 React의 일반적인 패턴이지만, **초당 60번 리렌더는 25개 그리드 아이템 전체를 다시 그리게** 합니다. throttle로 빈도를 줄여도 마우스 추적 같은 연속적 시각 효과에서는 **끊김이 체감**됩니다. useRef + RAF 방식은 React의 렌더 사이클을 완전히 우회하여 **DOM을 직접 조작**하므로, 리렌더 비용 없이 60fps를 유지할 수 있습니다. 이 패턴은 React 공식 문서에서도 **\"탈출구(escape hatch)\"**로 안내하는 정당한 최적화 기법입니다.",
          en: "useState is idiomatic React, but **60 re-renders/second forces all 25+ grid items to re-render**. Throttling reduces frequency but **stutter is still noticeable** in continuous visual effects like mouse tracking. useRef + RAF completely bypasses React's render cycle, **manipulating DOM directly** for zero re-render cost at 60fps. This pattern is acknowledged in React docs as a legitimate **\"escape hatch\"** optimization.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: { ko: "코드 블록 줄바꿈 토글 시 레이아웃이 갑자기 튐", en: "Layout Jumps When Toggling Code Block Line Wrap" },
    definition: {
      ko: "코드 블록의 줄바꿈을 토글하면 높이가 순간적으로 변하면서, **아래쪽 콘텐츠가 갑자기 밀려나는 레이아웃 시프트**가 발생했습니다.",
      en: "Toggling line wrap on code blocks caused an instant height change, producing a **layout shift that jolted content below**.",
    },
    cause: {
      ko: "블로그 포스트의 코드 블록에 **줄바꿈 토글 버튼**을 추가했습니다. `white-space: pre` → `pre-wrap` 전환 시 코드 블록의 높이가 변하면서, **아래쪽 콘텐츠가 갑자기 밀려나는 레이아웃 시프트**가 발생했습니다. CSS `transition`으로 `max-height`를 애니메이션하려 했지만, **최대 높이를 미리 알 수 없어** 값을 크게 잡으면 타이밍이 어긋나고, 작게 잡으면 잘리는 문제가 있었습니다.",
      en: "Added a **line-wrap toggle button** to blog code blocks. Switching `white-space: pre` → `pre-wrap` changed block height, causing **layout shift that pushed content below**. Tried CSS `transition` on `max-height`, but **the actual max height isn't known in advance** — set too high, timing feels wrong; too low, content clips.",
    },
    solution: {
      ko: "**FLIP(First-Last-Invert-Play) 기법**을 적용했습니다. 스타일 변경 전 높이를 측정(First)하고, 스타일을 바꾼 뒤 새 높이를 측정(Last)한 다음, **Web Animations API로 이전 높이 → 새 높이를 250ms 동안 애니메이션**합니다. React 상태를 거치지 않으므로 리렌더가 없고, 정확한 높이를 기반으로 동작하여 **어떤 코드 블록 길이에서도 자연스럽게 전환**됩니다.",
      en: "Applied the **FLIP (First-Last-Invert-Play) technique**. Measure height before style change (First), apply style and measure new height (Last), then **animate from old to new height over 250ms using Web Animations API**. No React re-renders involved, and since it's based on exact measurements, **transitions feel natural at any code block length**.",
    },
    keyInsight: {
      ko: "높이가 **동적으로 변하는 요소의 애니메이션에는 `max-height` 트릭보다 FLIP이 적합**합니다. 실제 높이를 측정한 뒤 애니메이션하므로 **타이밍이 정확**하고, Web Animations API는 React와 독립적이라 **리렌더 비용이 없습니다**.",
      en: "For animating **dynamically-sized elements, FLIP beats the `max-height` trick**. It measures actual heights before animating, ensuring **precise timing**, and Web Animations API runs independently of React with **zero re-render cost**.",
    },
    comparisons: [
      {
        label: { ko: "동적 높이 애니메이션 기법 비교", en: "Dynamic height animation technique comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "max-height 트릭", en: "max-height trick" },
          { ko: "CSS grid rows", en: "CSS grid rows" },
          { ko: "FLIP + WAAPI (채택)", en: "FLIP + WAAPI (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "높이 추정", en: "Height estimation" }, { ko: "임의 큰 값 필요", en: "Arbitrary large value" }, { ko: "0fr → 1fr", en: "0fr → 1fr" }, { ko: "실제 측정값 사용", en: "Uses measured value" }] },
          { cells: [{ ko: "타이밍 정확도", en: "Timing accuracy" }, { ko: "✗ 실제 높이와 불일치", en: "✗ Mismatch with actual" }, { ko: "△ 제한적", en: "△ Limited" }, { ko: "✓ 정확", en: "✓ Exact" }] },
          { cells: [{ ko: "콘텐츠 클리핑", en: "Content clipping" }, { ko: "값 작으면 잘림", en: "Clips if too small" }, { ko: "없음", en: "None" }, { ko: "없음", en: "None" }] },
          { cells: [{ ko: "리렌더 필요", en: "Re-render needed" }, { ko: "✗ (CSS only)", en: "✗ (CSS only)" }, { ko: "✗ (CSS only)", en: "✗ (CSS only)" }, { ko: "✗ (WAAPI)", en: "✗ (WAAPI)" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 코드 블록 높이 예측 불가", en: "✗ Code block height unpredictable" }, { ko: "△ 래퍼 요소 필요", en: "△ Wrapper element needed" }, { ko: "✓ 모든 높이에서 정확", en: "✓ Exact at any height" }], highlight: true },
        ],
        description: {
          ko: "`max-height` 트릭은 높이를 미리 알 수 있는 경우에만 유효합니다. 코드 블록은 **내용 길이에 따라 높이가 크게 달라지므로** 임의 값을 설정하면 타이밍이 맞지 않습니다. CSS `grid-template-rows: 0fr → 1fr` 방식은 래퍼 요소가 필요하고, 기존 마크다운 렌더러의 DOM 구조를 변경해야 합니다. **FLIP은 변경 전후의 실제 높이를 측정**하므로 어떤 코드 블록에서도 정확하게 동작하며, Web Animations API(WAAPI)는 **메인 스레드와 별도로 실행**되어 성능 영향이 없습니다.",
          en: "`max-height` only works when the target height is known in advance. Code blocks **vary dramatically in height by content length**, making arbitrary values unreliable. CSS `grid-template-rows: 0fr → 1fr` requires wrapper elements and changing the existing markdown renderer's DOM structure. **FLIP measures actual before/after heights**, working accurately for any code block, and Web Animations API (WAAPI) runs **off the main thread** with zero performance impact.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: { ko: "커스텀 커서의 무거운 hit-test가 가벼운 위치 보간을 함께 느리게 만듦", en: "Heavy Cursor Hit-Test Dragging Down Lightweight Position Interpolation" },
    definition: {
      ko: "커스텀 커서는 **위치 보간(LERP)**과 **요소 타입 판별(hit-test)**을 동시에 처리하는데, 둘 다 같은 RAF 루프에 묶여 있었습니다. hit-test에 쓰이는 `elementsFromPoint()`가 매 프레임 수백 개 DOM을 탐색하면서, **그 자체로는 가벼운 위치 보간까지 함께 느려졌습니다**.",
      en: "The custom cursor handled both **position interpolation (LERP)** and **element type detection (hit-test)** in the same RAF loop. The `elementsFromPoint()` call for hit-testing traversed hundreds of DOM elements per frame, **dragging down the otherwise lightweight position updates** along with it.",
    },
    cause: {
      ko: "커스텀 커서 효과에서 마우스 아래의 요소 타입(클릭 가능, 텍스트, 비활성 등)을 판별하기 위해 **`elementsFromPoint()`를 매 프레임 호출**하고 있었습니다. 이 API는 해당 좌표의 **모든 DOM 요소를 탐색**하므로, 복잡한 레이아웃에서는 **프레임당 수백 개의 요소를 순회**하게 됩니다. 커서 위치 보간(LERP)과 hit-test가 같은 RAF 루프에 묶여 있어, **위치 업데이트까지 함께 느려졌습니다**.",
      en: "The custom cursor effect called **`elementsFromPoint()` every frame** to determine the element type under the cursor (clickable, text, disabled, etc.). This API **traverses all DOM elements** at the coordinate, potentially **iterating hundreds of elements per frame** in complex layouts. Hit-testing and position interpolation (LERP) were coupled in the same RAF loop, so **even position updates slowed down**.",
    },
    solution: {
      ko: "커서 위치 보간과 hit-test를 **분리**했습니다. 위치 보간은 **매 프레임 RAF에서 실행**하여 부드러운 60fps를 유지하고, `elementsFromPoint()` hit-test는 **60ms 간격으로 디바운스**하여 별도로 실행합니다. 커서 모양(grab, pointer, text, disabled) 변경은 비동기로 반영되지만, **사람 눈에는 차이가 느껴지지 않습니다**. 터치 디바이스에서는 커스텀 커서 자체를 비활성화합니다.",
      en: "**Decoupled** position interpolation from hit-testing. Position LERP runs in **every RAF frame** for smooth 60fps, while `elementsFromPoint()` hit-test runs on a **60ms debounce** separately. Cursor shape changes (grab, pointer, text, disabled) update asynchronously, but the **delay is imperceptible to users**. Custom cursor is disabled entirely on touch devices.",
    },
    keyInsight: {
      ko: "07번이 \"React를 우회할 것인가\"의 문제였다면, 이 항목은 **\"같은 루프 안에서 비용이 다른 작업을 분리할 것인가\"**의 문제입니다. 위치 보간처럼 즉각 반영이 필요한 작업은 매 프레임, DOM 탐색처럼 무겁지만 지연이 허용되는 작업은 **낮은 빈도로 분리**하면 전체 성능이 크게 개선됩니다.",
      en: "While item 07 was about **whether to bypass React entirely**, this issue is about **separating tasks of different costs within the same loop**. Lightweight work needing instant reflection (position LERP) runs every frame, while heavy work tolerating slight delay (DOM traversal) runs at **lower frequency** — this tiered approach dramatically improves overall performance.",
    },
    comparisons: [
      {
        label: { ko: "커서 상태 감지 전략 비교", en: "Cursor state detection strategy comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "매 프레임 hit-test", en: "Per-frame hit-test" },
          { ko: "CSS :hover 위임", en: "CSS :hover delegation" },
          { ko: "디바운스 분리 (채택)", en: "Debounced separation (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "호출 빈도", en: "Call frequency" }, { ko: "~60/s", en: "~60/s" }, { ko: "이벤트 기반", en: "Event-driven" }, { ko: "~16/s (60ms)", en: "~16/s (60ms)" }] },
          { cells: [{ ko: "DOM 탐색 비용", en: "DOM traversal cost" }, { ko: "⚠ 매 프레임", en: "⚠ Every frame" }, { ko: "없음", en: "None" }, { ko: "프레임당 0~1회", en: "0-1 per frame" }] },
          { cells: [{ ko: "커서 위치 부드러움", en: "Cursor smoothness" }, { ko: "느려질 수 있음", en: "Can degrade" }, { ko: "영향 없음", en: "No impact" }, { ko: "항상 60fps", en: "Always 60fps" }] },
          { cells: [{ ko: "커스텀 커서 모양", en: "Custom cursor shapes" }, { ko: "✓ 다양", en: "✓ Multiple" }, { ko: "✗ 제한적", en: "✗ Limited" }, { ko: "✓ 다양", en: "✓ Multiple" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 복잡 레이아웃에서 병목", en: "✗ Bottleneck in complex layouts" }, { ko: "✗ 커서 모양 커스텀 불가", en: "✗ Can't customize cursor shapes" }, { ko: "✓ 성능 + 유연성", en: "✓ Performance + flexibility" }], highlight: true },
        ],
        description: {
          ko: "CSS `:hover`는 브라우저가 최적화하지만, **커서 모양을 data-attribute 기반으로 5종류(grab, pointer, text, disabled, default) 전환**하려면 JS가 필요합니다. 매 프레임 `elementsFromPoint()`는 정확하지만 **About 페이지처럼 중첩 요소가 많은 레이아웃에서 수백 개 요소를 탐색**합니다. 60ms 디바운스로 분리하면 호출 횟수를 **75% 줄이면서도** 커서 모양 변화의 지연(최대 60ms)은 **사람 눈에 감지되지 않습니다**.",
          en: "CSS `:hover` is browser-optimized, but **switching cursor shapes among 5 types (grab, pointer, text, disabled, default) based on data-attributes** requires JS. Per-frame `elementsFromPoint()` is accurate but **traverses hundreds of elements in nested layouts like the About page**. A 60ms debounce reduces calls by **75%** while the cursor shape delay (max 60ms) is **imperceptible to humans**.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: {
      ko: "커스텀 RichTextEditor의 기능 확장 한계",
      en: "Custom RichTextEditor Hitting Feature Extension Limits",
    },
    definition: {
      ko: "직접 구현한 RichTextEditor(textarea + 마크다운 프리뷰)는 **인라인 서식 미리보기 불가, 구조화된 콘텐츠 모델 부재, 테이블·수식·임베드 등 기능 추가가 극도로 어려운** 상태였습니다.",
      en: "The custom-built RichTextEditor (textarea + markdown preview) had **no inline formatting preview, no structured content model, and adding features like tables, math, and embeds was extremely difficult**.",
    },
    cause: {
      ko: "에디터가 **단순 textarea에 마크다운 렌더링을 붙인 구조**였기 때문에, 새로운 기능(테이블, 수식, 코드 블록, 이미지 등)을 추가할 때마다 **커스텀 파싱/렌더링 로직을 직접 구현**해야 했습니다. 각 기능이 독립적인 파싱 규칙을 필요로 하면서 **코드가 취약해지고 유지보수 비용이 누적**되었습니다. 결국 WYSIWYG 프레임워크가 이미 해결한 문제의 **80%를 직접 재구현**하고 있는 상황이었습니다.",
      en: "The editor was built as a **simple textarea with markdown rendering on preview**. Every new feature (tables, math, code blocks, images) required **custom parsing and rendering logic from scratch**. Each feature needed independent parsing rules, making the **codebase fragile and accumulating maintenance costs**. Ultimately, we were **reimplementing 80% of what WYSIWYG frameworks already solve**.",
    },
    solution: {
      ko: "**Plate.js(Slate.js 기반)**로 마이그레이션했습니다. 구조화된 문서 모델, 플러그인 아키텍처, 인라인 WYSIWYG 편집을 제공합니다. 기존 RichTextEditor의 CSS Module은 **공유 스타일로 유지**하고, 수식(KaTeX), 코드 블록(highlight.js), 테이블, 이미지, 임베드용 **커스텀 플러그인**을 구현했습니다.",
      en: "Migrated to **Plate.js (built on Slate.js)** — providing a structured document model, plugin architecture, and inline WYSIWYG editing. Kept the old RichTextEditor CSS module as **shared styles**. Built **custom plugins** for math (KaTeX), code blocks (highlight.js), tables, images, and embeds.",
    },
    keyInsight: {
      ko: "전형적인 **\"Build vs Buy\" 의사결정** 문제입니다. 커스텀 솔루션이 성숙한 프레임워크가 제공하는 기능의 80%를 재구현하고 있다면, **마이그레이션 비용이 커스텀 접근법의 지속적 유지보수 비용보다 낮습니다**.",
      en: "A classic **\"Build vs Buy\" decision** — when the custom solution requires reimplementing 80% of what an established framework provides, the **migration cost is lower than the ongoing maintenance cost** of the custom approach.",
    },
    comparisons: [
      {
        label: { ko: "에디터 접근 방식 비교", en: "Editor approach comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "Custom textarea + MD", en: "Custom textarea + MD" },
          { ko: "Plate.js (채택)", en: "Plate.js (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "인라인 서식 미리보기", en: "Inline formatting preview" }, { ko: "✗ 프리뷰 탭 전환 필요", en: "✗ Requires preview tab switch" }, { ko: "✓ WYSIWYG", en: "✓ WYSIWYG" }] },
          { cells: [{ ko: "콘텐츠 모델", en: "Content model" }, { ko: "평문 문자열", en: "Plain text string" }, { ko: "구조화된 문서 트리", en: "Structured document tree" }] },
          { cells: [{ ko: "기능 추가 비용", en: "Feature addition cost" }, { ko: "⚠ 파싱/렌더링 직접 구현", en: "⚠ Custom parsing/rendering" }, { ko: "플러그인으로 확장", en: "Plugin-based extension" }] },
          { cells: [{ ko: "테이블·수식·임베드", en: "Tables, math, embeds" }, { ko: "✗ 각각 커스텀 파서 필요", en: "✗ Each needs custom parser" }, { ko: "✓ 플러그인 아키텍처", en: "✓ Plugin architecture" }] },
          { cells: [{ ko: "유지보수 비용", en: "Maintenance cost" }, { ko: "⚠ 기능 추가마다 누적", en: "⚠ Accumulates per feature" }, { ko: "프레임워크가 핵심 로직 관리", en: "Framework handles core logic" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 확장 한계 도달", en: "✗ Hit extension limits" }, { ko: "✓ 구조화된 편집 + 플러그인", en: "✓ Structured editing + plugins" }], highlight: true },
        ],
        description: {
          ko: "커스텀 textarea 에디터는 초기에는 빠르게 구현할 수 있지만, **기능이 늘어날수록 파싱 로직이 복잡해지고 버그가 늘어납니다**. Plate.js는 Slate.js의 구조화된 문서 모델 위에 플러그인 시스템을 제공하므로, 테이블·수식·코드 블록 같은 복잡한 기능도 **독립적인 플러그인으로 격리**하여 관리할 수 있습니다. 기존 RichTextEditor의 CSS Module을 공유 스타일로 유지하여 **마이그레이션 시 시각적 일관성을 보존**했습니다.",
          en: "A custom textarea editor is quick to build initially, but **parsing logic grows complex and bugs multiply as features increase**. Plate.js provides a plugin system on top of Slate.js's structured document model, allowing complex features like tables, math, and code blocks to be **isolated as independent plugins**. Keeping the existing RichTextEditor CSS module as shared styles **preserved visual consistency during migration**.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: {
      ko: "이미지 원본 무압축 업로드 — 10MB 초과 실패 + 네트워크 낭비",
      en: "Uncompressed Image Upload — 10MB Limit Failures + Network Waste",
    },
    definition: {
      ko: "사용자가 선택한 이미지 파일을 **압축 없이 원본 그대로** FormData에 담아 서버로 전송했습니다. 스마트폰 사진(5–15MB)이나 고해상도 스크린샷은 **용량 제한에 걸려 업로드가 거부**되고, 제한 이하인 파일도 **불필요하게 큰 원본이 그대로 전송**되어 네트워크와 스토리지를 낭비했습니다.",
      en: "Image files were sent to the server **as-is without compression** via FormData. Smartphone photos (5–15MB) and high-resolution screenshots **hit the size limit and failed**, while files under the limit **wasted network bandwidth and storage** by uploading unnecessarily large originals.",
    },
    cause: {
      ko: "업로드 함수에 **클라이언트 압축 로직이 없었고**, 서버에서 용량 초과를 거부하는 것이 유일한 방어선이었습니다. 사용자는 **왜 업로드가 실패하는지 모른 채** 다시 시도하거나 포기하는 상황이 발생했습니다.",
      en: "The upload function had **no client-side compression logic** — the server's size rejection was the only defense. Users would **retry or give up without understanding** why the upload failed.",
    },
    solution: {
      ko: "업로드 전에 **브라우저에서 단계적 압축 파이프라인**을 실행합니다:\n\n1. **SVG/GIF → 스킵** (벡터/애니메이션은 Canvas 변환 불가)\n2. **용량 이하 → 스킵** (이미 작은 파일은 건드리지 않음)\n3. **WebP 변환** (`canvas.toBlob`, quality 0.85)\n4. **해상도 축소** (긴 변 최대 2560px)\n5. **품질 단계적 하향** (0.05씩 감소, 최저 0.7)\n\n`compressImage()` 유틸리티를 **dynamic import**로 불러와 번들 크기에 영향을 주지 않습니다.",
      en: "A **step-by-step compression pipeline runs in the browser** before upload:\n\n1. **SVG/GIF → skip** (vector/animation can't be Canvas-converted)\n2. **Under limit → skip** (don't touch already-small files)\n3. **WebP conversion** (`canvas.toBlob`, quality 0.85)\n4. **Resolution reduction** (max 2560px on longest side)\n5. **Quality step-down** (decrease by 0.05, minimum 0.7)\n\nThe `compressImage()` utility is loaded via **dynamic import** to avoid affecting bundle size.",
    },
    keyInsight: {
      ko: "이미지 압축은 **서버보다 클라이언트에서 하는 것이 합리적**입니다. 서버 압축은 이미 **큰 원본이 네트워크를 타고 올라온 뒤** 처리하므로 대역폭 절감 효과가 없고, 서버 CPU도 소모합니다. 클라이언트 압축은 **전송 전에 크기를 줄여** 업로드 시간과 스토리지를 동시에 절약합니다. WebP는 AVIF보다 압축률은 낮지만 **브라우저 인코딩 속도가 3–10배 빠르고 지원률도 높아** 클라이언트 처리에 적합합니다.",
      en: "Image compression is **more effective on the client than the server**. Server compression processes files **after they've already traveled the network at full size**, offering no bandwidth savings while consuming server CPU. Client compression **reduces size before transmission**, saving both upload time and storage. WebP has lower compression ratios than AVIF but is **3–10× faster to encode in browsers with wider support**, making it ideal for client-side processing.",
    },
    comparisons: [
      {
        label: { ko: "이미지 업로드 전략 비교", en: "Image upload strategy comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "원본 전송", en: "Raw upload" },
          { ko: "서버 압축", en: "Server compression" },
          { ko: "클라이언트 압축 (채택)", en: "Client compression (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "네트워크 사용량", en: "Network usage" }, { ko: "⚠ 원본 크기 그대로", en: "⚠ Full original size" }, { ko: "⚠ 원본 크기 그대로", en: "⚠ Full original size" }, { ko: "✓ 압축 후 전송", en: "✓ Compressed before send" }] },
          { cells: [{ ko: "업로드 실패율", en: "Upload failure rate" }, { ko: "⚠ 10MB 초과 시 거부", en: "⚠ Rejected over 10MB" }, { ko: "수용 가능 (제한 완화)", en: "Acceptable (relaxed limit)" }, { ko: "✓ 거의 없음", en: "✓ Near zero" }] },
          { cells: [{ ko: "서버 부하", en: "Server load" }, { ko: "없음", en: "None" }, { ko: "⚠ CPU 사용", en: "⚠ CPU usage" }, { ko: "없음", en: "None" }] },
          { cells: [{ ko: "사용자 체감", en: "User experience" }, { ko: "큰 파일 = 긴 대기", en: "Large files = long wait" }, { ko: "업로드 느림 + 서버 처리 대기", en: "Slow upload + server processing" }, { ko: "✓ 빠른 업로드", en: "✓ Fast upload" }] },
          { cells: [{ ko: "구현 위치", en: "Implementation" }, { ko: "없음", en: "None" }, { ko: "API 라우트 (Sharp 등)", en: "API route (Sharp, etc.)" }, { ko: "Canvas API (브라우저)", en: "Canvas API (browser)" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 대용량 실패", en: "✗ Large files fail" }, { ko: "△ 대역폭 낭비", en: "△ Bandwidth waste" }, { ko: "✓ 전송 전 최적화", en: "✓ Optimized before transfer" }], highlight: true },
        ],
        description: {
          ko: "원본 전송은 용량 제한에 취약하고, 서버 압축은 이미 큰 파일이 네트워크를 거친 뒤 처리됩니다. **클라이언트 압축은 브라우저에서 WebP 변환 + 리사이즈 + 품질 조절을 수행한 뒤** 작아진 파일만 전송하므로, 업로드 실패를 방지하고 네트워크·스토리지를 동시에 절약합니다.",
          en: "Raw upload is vulnerable to size limits, and server compression only processes after the large file has already traversed the network. **Client compression performs WebP conversion + resize + quality adjustment in the browser**, sending only the reduced file — preventing upload failures while saving both network bandwidth and storage.",
        },
      } satisfies ComparisonTable,
    ],
    diagrams: [
      {
        title: { ko: "클라이언트 이미지 압축 파이프라인", en: "Client-side Image Compression Pipeline" },
        nodes: [
          { id: "start", type: "start", label: { ko: "이미지 선택", en: "Select image" }, row: 0, col: 0 },
          { id: "check_type", type: "decision", label: { ko: "SVG / GIF?", en: "SVG / GIF?" }, row: 1, col: 0 },
          { id: "skip", type: "end", label: { ko: "원본 그대로 업로드", en: "Upload original" }, row: 1, col: 1 },
          { id: "check_size", type: "decision", label: { ko: "용량 초과?", en: "Over limit?" }, row: 2, col: 0 },
          { id: "webp", type: "action", label: { ko: "WebP 변환 (q: 0.85)", en: "Convert WebP (q: 0.85)" }, row: 3, col: 0 },
          { id: "check_webp", type: "decision", label: { ko: "아직 큰가?", en: "Still over?" }, row: 4, col: 0 },
          { id: "resize", type: "action", label: { ko: "해상도 축소 (max 2560px)", en: "Resize (max 2560px)" }, row: 5, col: 0 },
          { id: "check_resize", type: "decision", label: { ko: "아직 큰가?", en: "Still over?" }, row: 6, col: 0 },
          { id: "quality", type: "action", label: { ko: "품질 하향 (0.05씩, 최저 0.7)", en: "Quality step-down (−0.05, min 0.7)" }, row: 7, col: 0 },
          { id: "done", type: "end", label: { ko: "압축 완료 → 업로드", en: "Compressed → Upload" }, row: 8, col: 0 },
        ],
        edges: [
          { from: "start", to: "check_type" },
          { from: "check_type", to: "skip", label: "Yes" },
          { from: "check_type", to: "check_size", label: "No" },
          { from: "check_size", to: "done", label: "No" },
          { from: "check_size", to: "webp", label: "Yes" },
          { from: "webp", to: "check_webp" },
          { from: "check_webp", to: "done", label: "No" },
          { from: "check_webp", to: "resize", label: "Yes" },
          { from: "resize", to: "check_resize" },
          { from: "check_resize", to: "done", label: "No" },
          { from: "check_resize", to: "quality", label: "Yes" },
          { from: "quality", to: "done" },
        ],
      } satisfies TroubleshootingDiagram,
    ],
  },

  /* ── CSS / Styling ── */
  {
    section: { ko: "CSS / Styling", en: "CSS / Styling" },
    problem: { ko: "글로벌 transition shorthand가 컴포넌트 전환 효과를 덮어씀", en: "Global Transition Shorthand Overriding Component Transitions" },
    definition: {
      ko: "테마 전환용 글로벌 `transition`이 컴포넌트의 **`max-height`, `opacity`, `transform` 전환을 모두 무시**시켜, 인터랙션 애니메이션이 동작하지 않았습니다.",
      en: "The global theme `transition` **overrode component-level `max-height`, `opacity`, `transform` transitions**, causing interaction animations to stop working.",
    },
    cause: {
      ko: "테마 전환을 위해 `html[data-theme-ready] *`에 **transition shorthand**를 걸어 `background-color, border-color, color` 등을 부드럽게 전환했습니다. 그런데 이 선택자의 특이성이 `(0,1,1)`로, 단일 클래스 `(0,1,0)`보다 높아서 **컴포넌트의 `max-height`, `opacity`, `transform` 전환이 모두 무시**되었습니다. `transition`이 shorthand이기 때문에 **나열되지 않은 속성의 전환까지 통째로 교체**한 것이 원인이었습니다.",
      en: "For theme switching, I set a **transition shorthand** on `html[data-theme-ready] *` to smoothly transition `background-color, border-color, color`, etc. But its specificity `(0,1,1)` beats single-class selectors `(0,1,0)`, and since `transition` is a shorthand, it **completely replaced** component-level transitions for `max-height`, `opacity`, `transform`, etc.",
    },
    solution: {
      ko: "컴포넌트에서 글로벌 규칙을 이길 수 있도록 **복합 선택자 `(0,2,0)`**을 사용했습니다. `.parent .child { transition: ... }` 형태로 특이성을 올려 글로벌 shorthand를 안전하게 오버라이드합니다.",
      en: "Used **compound selectors `(0,2,0)`** in components to outweigh the global rule. Patterns like `.parent .child { transition: ... }` safely override the global shorthand.",
    },
    keyInsight: {
      ko: "CSS `transition` shorthand는 **나열하지 않은 속성의 전환까지 초기화**합니다. 글로벌에 `*` 전환을 걸 때는 shorthand 대신 **`transition-property, transition-duration`을 개별 지정**하거나, 컴포넌트 쪽 특이성을 반드시 높여야 합니다.",
      en: "CSS `transition` shorthand **resets transitions for unlisted properties too**. When applying `*` transitions globally, either use **individual `transition-property` and `transition-duration`** instead of shorthand, or ensure component selectors have higher specificity.",
    },
  },
  {
    problem: { ko: "CSS Module 해시 충돌로 데스크톱 레이아웃 붕괴", en: "CSS Module Hash Collision Collapsing Desktop Layout" },
    definition: {
      ko: "데스크톱에서 `display: contents`가 적용되지 않아, About 페이지의 ProcessPanel **레이아웃이 완전히 무너졌습니다**.",
      en: "On desktop, `display: contents` failed to apply, **completely breaking** the ProcessPanel layout on the About page.",
    },
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
  {
    problem: { ko: "Richtext 게시물에서 코드 하이라이팅·줄바꿈 버튼이 사라짐", en: "Code Highlighting & Wrap Button Vanishing on Richtext Posts" },
    definition: {
      ko: "Plate 에디터로 작성한 richtext 게시물의 코드블록에서 **구문 하이라이팅과 줄바꿈/스크롤 토글 버튼이 표시되지 않았습니다**. Markdown 게시물에서는 정상 동작했습니다.",
      en: "Code blocks in richtext posts written with the Plate editor **lost syntax highlighting and the wrap/scroll toggle button**. Markdown posts worked correctly.",
    },
    cause: {
      ko: "코드 하이라이팅(highlight.js)과 버튼 라벨은 `useEffect`에서 **DOM을 직접 조작**하여 적용하고 있었습니다. 그러나 페이지 로드 후 API 호출(`좋아요 수`, `인접 게시물`, `추천 게시물` 등)이 완료되면 **state 변경 → React 리렌더 → `dangerouslySetInnerHTML`이 원본 HTML로 DOM을 덮어쓰기** → `useEffect`로 추가한 hljs 클래스와 버튼 라벨이 전부 사라졌습니다. `useEffect`의 의존성(`displayContent`, `t`)은 변하지 않아 **재실행되지 않았습니다**. Markdown 게시물은 `MarkdownRenderer`가 **서버에서 이미 하이라이팅을 적용한 HTML**을 생성하므로 영향이 없었습니다.",
      en: "Code highlighting (highlight.js) and button labels were applied by **directly manipulating the DOM in `useEffect`**. However, after page load, API calls (like count, adjacent posts, recommended posts) completed → **state changes → React re-render → `dangerouslySetInnerHTML` overwrites DOM with original HTML** → all hljs classes and button labels added by `useEffect` were wiped. The `useEffect` dependencies (`displayContent`, `t`) hadn't changed, so it **never re-ran**. Markdown posts were unaffected because `MarkdownRenderer` generates **pre-highlighted HTML on the server**.",
    },
    solution: {
      ko: "DOM 조작 대신 `useMemo` 단계에서 **HTML 문자열 자체에 하이라이팅과 버튼 라벨을 적용**했습니다. `<pre><code>` 블록을 정규식으로 찾아 `hljs.highlight()`로 구문 강조하고, 빈 `<button data-wrap-btn>` 에 라벨 span을 삽입한 완성된 HTML을 `dangerouslySetInnerHTML`에 전달합니다. `useEffect`는 **클릭 이벤트 위임만** 담당합니다.",
      en: "Instead of DOM manipulation, applied **highlighting and button labels to the HTML string itself in `useMemo`**. `<pre><code>` blocks are found via regex, highlighted with `hljs.highlight()`, and empty `<button data-wrap-btn>` elements are filled with label spans — all before passing the completed HTML to `dangerouslySetInnerHTML`. `useEffect` only handles **click event delegation**.",
    },
    keyInsight: {
      ko: "`dangerouslySetInnerHTML`로 렌더하는 콘텐츠는 **React의 리렌더 사이클에서 보호받지 못합니다**. DOM 조작으로 추가한 변경은 어떤 state 변경이든 리렌더가 발생하면 사라집니다. **서버/빌드 타임에 HTML을 완성**하거나, `useMemo`에서 **문자열 단계로 처리**해야 합니다.",
      en: "`dangerouslySetInnerHTML` content is **not protected across React's re-render cycle**. DOM changes added via `useEffect` vanish on any state-triggered re-render. The HTML must be **finalized at server/build time** or **processed at the string level in `useMemo`**.",
    },
    comparisons: [
      {
        label: { ko: "코드 하이라이팅 적용 방식 비교", en: "Code highlighting approach comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "useEffect DOM 조작", en: "useEffect DOM manipulation" },
          { ko: "useMemo 문자열 처리 (채택)", en: "useMemo string processing (adopted)" },
        ],
        rows: [
          {
            cells: [
              { ko: "리렌더 내성", en: "Re-render resilience" },
              { ko: "❌ state 변경 시 소실", en: "❌ Lost on state change" },
              { ko: "✅ HTML에 포함되어 유지", en: "✅ Embedded in HTML, persists" },
            ],
          },
          {
            cells: [
              { ko: "SSR 호환", en: "SSR compatible" },
              { ko: "❌ 클라이언트 전용", en: "❌ Client-only" },
              { ko: "✅ 서버 렌더 가능", en: "✅ Can run server-side" },
            ],
          },
          {
            cells: [
              { ko: "실행 시점", en: "Execution timing" },
              { ko: "렌더 후 (깜빡임 가능)", en: "Post-render (may flash)" },
              { ko: "렌더 전 (즉시 표시)", en: "Pre-render (instant display)" },
            ],
          },
        ],
      },
    ],
  },

  /* ── Editor ── */
  {
    section: { ko: "Editor", en: "Editor" },
    problem: { ko: "Plate 에디터에서 컨텍스트 툴바 표시 시 커서가 멋대로 튐", en: "Cursor Jumping Randomly When Contextual Toolbar Appears in Plate Editor" },
    definition: {
      ko: "에디터에서 테이블·열블록·수식 등 블록을 선택하면 상단에 컨텍스트 툴바가 나타나는데, **툴바가 나타나는 순간 커서가 다른 위치로 점프**하거나, 일반 텍스트를 입력하는 중에도 **커서가 갑자기 문서 앞쪽으로 이동**하는 현상이 발생했습니다.",
      en: "When selecting blocks like tables, columns, or equations, a contextual toolbar appears at the top. **The cursor jumped to random positions the moment the toolbar appeared**, and even during normal text input, **the cursor suddenly moved to the beginning of the document**.",
    },
    cause: {
      ko: "`MutationObserver`를 사용하여 에디터 DOM의 **모든 변경(childList, subtree, attributes)**을 감시하고, 변경이 감지되면 `scrollEl.style.overflow = 'hidden'` → `scrollEl.style.overflow = ''`를 토글하여 스크롤 위치를 보정하고 있었습니다. 문제는 **타이핑할 때마다** Slate가 DOM을 업데이트하면 이 observer가 실행되고, `overflow` 토글이 **브라우저의 `contentEditable` selection을 리셋**시킨다는 것이었습니다. 또한 `renderLeaf`에 **매 렌더마다 새로운 inline 함수**를 전달하여 PlateContent가 모든 leaf를 리렌더링하는 것도 원인이었습니다.",
      en: "A `MutationObserver` was watching **all DOM changes (childList, subtree, attributes)** in the editor, toggling `scrollEl.style.overflow = 'hidden'` → `scrollEl.style.overflow = ''` on each mutation to adjust scroll position. The problem was that **every keystroke** triggered Slate DOM updates → observer fired → `overflow` toggle **reset the browser's `contentEditable` selection**. Additionally, passing a **new inline function to `renderLeaf` on every render** caused PlateContent to re-render all leaves.",
    },
    solution: {
      ko: "`MutationObserver`를 **완전히 제거**하고, `overflow` 토글 없이 `scrollPaddingTop`만 설정하도록 변경했습니다. 툴바 visibility 상태를 문자열 key로 통합하여 **상태 변경 시에만 `requestAnimationFrame`으로 측정**합니다. `renderLeaf`는 **모듈 레벨의 안정적인 함수 참조**로 분리하고, `decorate`와 함께 **find가 열려있을 때만** PlateContent에 전달합니다.",
      en: "**Completely removed the `MutationObserver`** and switched to only setting `scrollPaddingTop` without any `overflow` toggling. Toolbar visibility states are combined into a string key and **measured only on state changes via `requestAnimationFrame`**. `renderLeaf` was extracted to a **stable module-level function reference**, and both `decorate` and `renderLeaf` are **only passed to PlateContent when find is open**.",
    },
    keyInsight: {
      ko: "`contentEditable` 요소에서 **`overflow` 속성을 동적으로 변경하면 브라우저가 selection을 리셋**할 수 있습니다. Slate/Plate 에디터의 DOM은 프레임워크가 관리하므로, `MutationObserver`로 감시하면 **모든 키 입력이 observer를 트리거**합니다. 성능에 민감한 영역에서는 DOM 감시 대신 **React state 기반으로 반응**해야 합니다.",
      en: "**Dynamically changing `overflow` on a `contentEditable` element can cause browsers to reset the selection.** Since Slate/Plate manages the DOM, a `MutationObserver` means **every keystroke triggers the observer**. In performance-sensitive areas, react to **React state changes instead of observing DOM mutations**.",
    },
  },
  {
    problem: { ko: "토글·콜아웃·열블록 콘텐츠가 저장 후 사라짐", en: "Toggle, Callout, and Column Block Content Disappearing After Save" },
    definition: {
      ko: "Plate 에디터에서 토글·콜아웃·열블록을 작성하고 저장한 뒤 다시 열면, **블록 자체는 남아있지만 내부 콘텐츠가 모두 비어있었습니다**. 제목이나 구조는 유지되었으나 본문 텍스트, 목록, 중첩 블록이 전부 유실되었습니다.",
      en: "After writing toggle, callout, and column blocks in the Plate editor and reloading, **the blocks themselves remained but all inner content was empty**. Titles and structure were preserved, but body text, lists, and nested blocks were completely lost.",
    },
    cause: {
      ko: "각 플러그인의 HTML deserializer `parse` 함수에서 **`children: []`를 명시적으로 반환**하고 있었습니다. Plate의 HTML deserializer는 `parse`가 `children`을 반환하지 않으면 **HTML 자식 노드를 자동으로 재귀 파싱**하지만, 빈 배열 `[]`이 명시되면 **'자식이 없다'고 판단하여 HTML 파싱을 건너뛰었습니다**. 토글·콜아웃·열블록·열 아이템 4개 플러그인 모두 동일한 문제가 있었습니다.",
      en: "Each plugin's HTML deserializer `parse` function **explicitly returned `children: []`**. Plate's HTML deserializer **automatically parses child HTML nodes recursively** when `parse` doesn't return `children`, but when an empty array `[]` is explicitly provided, it **treats it as 'no children' and skips HTML parsing**. All four plugins — toggle, callout, column group, and column item — had the same issue.",
    },
    solution: {
      ko: "각 deserializer의 `parse` 반환 객체에서 **`children: []`를 제거**했습니다. `children` 필드가 없으면 Plate가 `<div>` 내부의 HTML을 자동으로 재귀 파싱하여 Slate 노드로 변환합니다.",
      en: "**Removed `children: []`** from each deserializer's `parse` return object. Without the `children` field, Plate automatically parses the inner HTML recursively and converts it to Slate nodes.",
    },
    keyInsight: {
      ko: "프레임워크의 **기본 동작(convention over configuration)**을 이해해야 합니다. Plate deserializer에서 `children`을 생략하면 자동 파싱, 명시하면 수동 제어 — 빈 배열은 **'자식 없음'이라는 의도적 선언**으로 해석됩니다. 불필요한 명시가 프레임워크의 자동 동작을 차단할 수 있습니다.",
      en: "Understanding a framework's **default behavior (convention over configuration)** is essential. In Plate's deserializer, omitting `children` triggers automatic parsing, while specifying it means manual control — an empty array is interpreted as **an intentional declaration of 'no children'**. Unnecessary explicit values can block the framework's automatic behavior.",
    },
    comparisons: [
      {
        label: { ko: "deserializer children 반환 방식 비교", en: "Deserializer children return comparison" },
        headers: [
          { ko: "반환 방식", en: "Return style" },
          { ko: "Plate 동작", en: "Plate behavior" },
          { ko: "결과", en: "Result" },
        ],
        rows: [
          {
            cells: [
              { ko: "children: []", en: "children: []" },
              { ko: "HTML 자식 파싱 건너뜀", en: "Skips HTML child parsing" },
              { ko: "❌ 내부 콘텐츠 유실", en: "❌ Inner content lost" },
            ],
          },
          {
            cells: [
              { ko: "children 생략 (채택)", en: "Omit children (adopted)" },
              { ko: "HTML 자식 자동 재귀 파싱", en: "Auto-recursive HTML child parsing" },
              { ko: "✅ 콘텐츠 보존", en: "✅ Content preserved" },
            ],
            highlight: true,
          },
        ],
      } satisfies ComparisonTable,
    ],
  },
  /* ── Editor ── */
  {
    section: { ko: "Editor", en: "Editor" },
    problem: { ko: "제목(heading) 안 각주가 마크다운 변환 시 처리 안 됨", en: "Footnotes Inside Headings Not Processed During Markdown Conversion" },
    definition: {
      ko: "리치텍스트 에디터에서 제목에 각주를 넣고 마크다운으로 전환하면, 각주가 `[^1]` 텍스트 그대로 남아 **미리보기에서 각주로 인식되지 않았습니다**.",
      en: "When converting headings with footnotes from richtext to markdown, the footnote remained as literal `[^1]` text and **was not recognized as a footnote in preview**.",
    },
    cause: {
      ko: "`marked-footnote` 플러그인이 인라인 각주를 처리하기 **전에** 커스텀 `heading` renderer가 먼저 실행되어, 제목 텍스트 안의 `[^N]`이 각주 HTML로 변환되지 않고 원본 그대로 출력되었습니다. 본문의 `[^N]`은 정상 변환되었지만, **heading renderer가 파싱 파이프라인을 우회**하는 구조적 문제였습니다.",
      en: "The custom `heading` renderer executed **before** `marked-footnote` could process inline footnotes, so `[^N]` inside heading text was output as-is without conversion to footnote HTML. Body `[^N]` worked fine, but **the heading renderer bypassed the parsing pipeline**.",
    },
    solution: {
      ko: "커스텀 heading renderer를 제거하고, `postprocess` hook으로 대체했습니다. `marked-footnote`가 heading 포함 모든 각주를 먼저 처리한 뒤, `postprocess`에서 `<h1>`~`<h6>` 태그에 id(slug)만 추가합니다. 추가로 `keepLabels: true` 옵션을 적용하여 사용자가 입력한 각주 번호를 그대로 유지합니다.",
      en: "Replaced the custom heading renderer with a `postprocess` hook. `marked-footnote` processes all footnotes (including headings) first, then `postprocess` adds id (slug) to `<h1>`-`<h6>` tags. Additionally applied `keepLabels: true` to preserve user-specified footnote numbers.",
    },
    keyInsight: {
      ko: "마크다운 플러그인과 커스텀 renderer가 **같은 토큰을 경합**하면 파싱이 꼬입니다. renderer 대신 `postprocess` hook을 사용하면 플러그인이 먼저 동작한 **결과 HTML을 안전하게 후처리**할 수 있습니다.",
      en: "When markdown plugins and custom renderers **compete for the same tokens**, parsing breaks. Using `postprocess` hooks instead of renderers allows **safe post-processing of the plugin-generated HTML**.",
    },
  },
  {
    problem: { ko: "Plate inline void 노드에서 클릭 vs 키보드 구분 불가", en: "Cannot Distinguish Click vs Keyboard for Plate Inline Void Nodes" },
    definition: {
      ko: "각주 참조(`[1]`)를 클릭하면 설명란으로 스크롤해야 하고, 방향키로 진입하면 편집 모드로 들어가야 하는데, `useSelected` 훅이 **두 경우를 구분하지 못해** 클릭해도 편집 모드로 진입하는 문제가 있었습니다.",
      en: "Clicking a footnote ref `[1]` should scroll to its definition, while arrow-key navigation should enter edit mode. But the `useSelected` hook **couldn't distinguish between the two**, causing edit mode to activate on click.",
    },
    cause: {
      ko: "Plate의 `useSelected()`는 노드가 **어떤 방식으로든 선택되면** true를 반환합니다. 클릭이든 방향키든 구분하지 않습니다. `<sup>` 요소에 `onMouseDown` 핸들러를 달아도, void 노드 **바깥** 클릭(오른쪽 빈 공간)은 해당 핸들러를 거치지 않아 구분이 불가능했습니다.",
      en: "Plate's `useSelected()` returns true when the node is **selected by any means** — click or arrow key. Adding `onMouseDown` to the `<sup>` element didn't help because clicks on the **outside** of the void node (right side empty space) bypassed the handler.",
    },
    solution: {
      ko: "`document.addEventListener('mousedown')` 레벨에서 마우스 사용 여부를 플래그(`wasMouseRef`)로 기록합니다. `useSelected`가 true가 될 때 이 플래그를 확인하여: **마우스 → 편집 안 함**, **키보드 → 편집 진입**. `mouseup` 후 `requestAnimationFrame`으로 플래그를 리셋합니다.",
      en: "Track mouse usage at the `document.addEventListener('mousedown')` level with a flag (`wasMouseRef`). When `useSelected` becomes true, check this flag: **mouse → no edit**, **keyboard → enter edit**. Reset the flag after `mouseup` via `requestAnimationFrame`.",
    },
    keyInsight: {
      ko: "**이벤트 소스 구분은 컴포넌트 레벨이 아닌 document 레벨에서** 해야 합니다. inline void 노드는 주변 클릭도 선택을 트리거하므로, 컴포넌트 내부 핸들러만으로는 모든 케이스를 커버할 수 없습니다.",
      en: "**Event source distinction must happen at the document level, not component level**. Inline void nodes can be selected by clicks on surrounding areas, so component-internal handlers alone cannot cover all cases.",
    },
  },
  /* ── Admin / Refactoring ── */
  {
    section: { ko: "Admin / Refactoring", en: "Admin / Refactoring" },
    problem: { ko: "Admin 리스트(시리즈/휴지통/게시물)의 UI 코드 중복과 스타일 불일치", en: "Admin List (Series/Trash/Posts) UI Code Duplication and Style Inconsistency" },
    definition: {
      ko: "시리즈·휴지통·게시물 세 영역이 각각 **별도의 ul/li 또는 grid 레이아웃**으로 구현되어, 헤더·행 높이·패딩·폰트·bulk bar 스타일이 제각각이었습니다. 검색 UI도 페이지마다 인라인으로 반복 구현되어 있었습니다.",
      en: "Series, trash, and post lists were each implemented with **separate ul/li or grid layouts**, resulting in inconsistent header, row height, padding, font, and bulk bar styles. Search UI was also inline-duplicated per page.",
    },
    cause: {
      ko: "메인 게시물 테이블(`AdminTable`)은 publish 토글·편집 링크·드래그 정렬 등 고유 기능이 있어 시리즈/휴지통에 그대로 재사용이 어려웠습니다. 이로 인해 각 영역이 **독자적으로 체크박스·드래그 선택·bulk bar·페이지네이션을 구현**하면서 CSS만 700줄 이상, 동일 패턴이 3곳에 중복되었습니다.",
      en: "The main post table (`AdminTable`) had unique features like publish toggle, edit links, and drag reorder, making it difficult to reuse for series/trash. Each area **independently implemented checkboxes, drag selection, bulk bar, and pagination**, resulting in 700+ lines of CSS and the same patterns duplicated in 3 places.",
    },
    solution: {
      ko: "공통 패턴을 3개 컴포넌트로 추출했습니다: **SubTable**(접기/펼치기 토글 + 그리드 행 + 체크박스/드래그 선택 + bulk bar + 페이지네이션), **SearchCapsule**(검색 타입 Select + input을 캡슐 형태로 묶음), **DraggableTag**(드래그 정렬 가능한 태그). 시리즈·휴지통을 SubTable로 전환하고, 모든 검색 UI를 SearchCapsule로 교체했습니다. CSS는 700줄 이상 → 약 220줄로 줄었습니다.",
      en: "Extracted common patterns into 3 components: **SubTable** (collapsible toggle + grid rows + checkbox/drag select + bulk bar + pagination), **SearchCapsule** (search type Select + input grouped in capsule), **DraggableTag** (drag-sortable tag). Converted series/trash to SubTable and replaced all search UI with SearchCapsule. CSS reduced from 700+ lines to ~220 lines.",
    },
    keyInsight: {
      ko: "기존 컴포넌트(AdminTable)를 무리하게 확장하는 대신, **공통 패턴만 추출하여 별도 컴포넌트로 분리**하면 기존 기능을 깨뜨리지 않으면서 중복을 제거할 수 있습니다. 100% 재사용보다 **80% 공통화 + 20% 커스텀**이 현실적입니다.",
      en: "Rather than force-extending the existing component (AdminTable), **extracting only common patterns into separate components** removes duplication without breaking existing features. **80% shared + 20% custom** is more practical than 100% reuse.",
    },
    comparisons: [
      {
        label: { ko: "리팩토링 전후 비교", en: "Before/After refactoring comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "리팩토링 전", en: "Before" },
          { ko: "리팩토링 후", en: "After" },
        ],
        rows: [
          { cells: [{ ko: "시리즈 리스트", en: "Series list" }, { ko: "수동 ul/li + flex", en: "Manual ul/li + flex" }, { ko: "SubTable 컴포넌트", en: "SubTable component" }] },
          { cells: [{ ko: "휴지통 리스트", en: "Trash list" }, { ko: "수동 ul/li + flex", en: "Manual ul/li + flex" }, { ko: "SubTable 컴포넌트", en: "SubTable component" }] },
          { cells: [{ ko: "검색 UI", en: "Search UI" }, { ko: "페이지별 인라인 3벌", en: "3 inline copies per page" }, { ko: "SearchCapsule 공통", en: "Shared SearchCapsule" }] },
          { cells: [{ ko: "카테고리 태그", en: "Category tags" }, { ko: "페이지별 개별 구현", en: "Per-page implementation" }, { ko: "DraggableTag 공통", en: "Shared DraggableTag" }] },
          { cells: [{ ko: "CSS 규모 (Posts)", en: "CSS size (Posts)" }, { ko: "~744줄", en: "~744 lines" }, { ko: "~220줄", en: "~220 lines" }] },
        ],
      } satisfies ComparisonTable,
    ],
  },
  /* ── Backend / Autosave ── */
  {
    section: { ko: "Backend / Autosave", en: "Backend / Autosave" },
    problem: { ko: "카테고리 자동 보정으로 리비전 프롬프트가 무한 반복", en: "Revision Prompt Loops Due to Category Auto-Correction" },
    definition: {
      ko: "게시물을 열 때마다 '자동저장된 버전을 불러올까요?' 프롬프트가 반복 표시되었습니다. 무시를 눌러도 새로고침하면 다시 물어봤습니다.",
      en: "Every time a post was opened, the 'Load autosaved version?' prompt appeared repeatedly. Even after dismissing, refreshing would ask again.",
    },
    cause: {
      ko: "등록되지 않은 카테고리(예: 'General')를 가진 게시물이 열리면 '기타'로 자동 보정됩니다. 이 변경이 30초 후 자동저장을 트리거하여 새 리비전이 생성되고, 무시(dismiss) 처리된 기존 리비전과 **내용은 동일하지만 새 row**가 DB에 추가되어 매번 프롬프트가 뜨는 루프가 발생했습니다.",
      en: "Posts with unregistered categories (e.g., 'General') get auto-corrected to a default. This change triggers autosave after 30s, creating a new revision row with **identical content** to the dismissed one, causing an infinite prompt loop.",
    },
    solution: {
      ko: "리비전 저장 API에서 **직전 리비전의 snapshot과 키 정렬 비교**를 수행하여, 내용이 동일하면 새 row를 생성하지 않고 기존 리비전의 ID를 반환합니다. 클라이언트는 `skipped` 플래그를 확인하여 목록에 추가하지 않고 '자동저장됨' 상태도 표시하지 않습니다.",
      en: "The revision save API performs **sorted-key comparison** with the previous revision's snapshot. If identical, it returns the existing revision ID without creating a new row. The client checks the `skipped` flag to avoid adding to the list or showing 'autosaved' status.",
    },
    keyInsight: {
      ko: "자동 보정(카테고리, 기본값 등)은 **사용자 의도와 무관한 변경**입니다. 이런 변경이 자동저장 → 리비전 생성 → 프롬프트 루프를 만들 수 있으므로, **서버 측에서 중복 snapshot을 거르는 것**이 클라이언트 로직을 복잡하게 만들지 않는 가장 확실한 해결책입니다.",
      en: "Auto-corrections (categories, defaults) are **changes unrelated to user intent**. They can create autosave → revision → prompt loops, so **server-side duplicate snapshot filtering** is the most robust solution without complicating client logic.",
    },
  },

  /* ── Editor ── */
  {
    section: { ko: "에디터", en: "Editor" },
    problem: { ko: "인라인 이미지 양옆에 커서 배치·텍스트 입력 불가", en: "Cannot Place Cursor or Type Next to Inline Images" },
    definition: {
      ko: "Plate(Slate) 에디터에서 이미지를 인라인 void로 설정했으나, 이미지 양옆에 **클릭이나 방향키로 커서를 놓을 수 없어** 텍스트를 삽입할 수 없었습니다.",
      en: "Images in the Plate (Slate) editor were set as inline void, but it was **impossible to place the cursor beside the image via click or arrow keys**, preventing text insertion.",
    },
    cause: {
      ko: "Slate의 정규화는 인라인 void 주변에 빈 텍스트 노드(zero-width space)를 자동 삽입하지만, ImageElement 내부에서 `<div>` (BlockDropZone + wrapper)가 인라인 `<span>` (PlateElement) 안에 중첩되어 있었습니다. **`<div>`는 블록 요소라 인라인 흐름을 깨뜨려**, 브라우저가 인접 텍스트 노드에 대한 커서 접근을 차단했습니다.",
      en: "Slate's normalization correctly inserts empty text nodes around inline voids, but the ImageElement nested `<div>` elements (BlockDropZone + wrapper) inside an inline `<span>` (PlateElement). **`<div>` is a block element that breaks inline flow**, causing the browser to block cursor access to adjacent text nodes.",
    },
    solution: {
      ko: "`imgLayout === \"inline\"`일 때 별도 렌더링 분기를 만들어 **모든 wrapper를 `<span>`으로 변경**하고 BlockDropZone을 제거했습니다. 또한 이미지 양쪽에 absolute 배치된 `InlineCursorTarget`을 추가하여, 클릭 시 `editor.api.before()`/`after()`로 커서를 정확히 배치합니다.",
      en: "Created a separate rendering branch for `imgLayout === \"inline\"` that **converts all wrappers to `<span>`** and removes BlockDropZone. Added absolute-positioned `InlineCursorTarget` components that use `editor.api.before()`/`after()` to precisely place the cursor on click.",
    },
    keyInsight: {
      ko: "인라인 void 요소 안에 `<div>`가 들어가면 **브라우저가 인라인 흐름을 파괴**하여, Slate가 자동 삽입한 빈 텍스트 노드에 커서를 배치할 수 없게 됩니다. 인라인 요소 내부에는 반드시 `<span>` 등 인라인 태그만 사용해야 합니다.",
      en: "Placing `<div>` inside an inline void element **destroys the browser's inline flow**, preventing cursor placement in Slate's auto-inserted empty text nodes. Only inline tags like `<span>` should be used inside inline elements.",
    },
  },
  {
    section: { ko: "에디터 / CSS", en: "Editor / CSS" },
    problem: { ko: "테마 전환 글로벌 transition이 컴포넌트 애니메이션 덮어쓰기", en: "Global Theme Transition Overriding Component Animations" },
    definition: {
      ko: "다크/라이트 테마 전환을 위한 글로벌 CSS transition 규칙이, 에디터 toolbar 접기·토글 열기 등 **`max-height`, `opacity`, `transform` transition을 모두 무시**하게 만들었습니다.",
      en: "A global CSS transition rule for dark/light theme switching caused **`max-height`, `opacity`, `transform` transitions to be silently ignored** in editor toolbar collapse, toggle open, etc.",
    },
    cause: {
      ko: "`transition`은 shorthand 속성이라, `transition: background-color 0.3s` 선언이 컴포넌트의 `transition: max-height 0.3s`를 **완전히 덮어씁니다**. 글로벌 `html[attr] *`의 specificity `(0,1,1)`이 CSS Module 단일 클래스 `(0,1,0)`보다 높아 항상 우선합니다.",
      en: "`transition` is a shorthand property, so `transition: background-color 0.3s` **completely overwrites** a component's `transition: max-height 0.3s`. The global `html[attr] *` specificity `(0,1,1)` always beats CSS Module single-class `(0,1,0)`.",
    },
    solution: {
      ko: "글로벌 transition을 `data-theme-transitioning` 속성으로 변경하여 **테마 전환 시 350ms 윈도우 동안만 적용**. 평상시에는 비활성이므로 컴포넌트 transition이 정상 동작합니다.",
      en: "Changed the global transition to a `data-theme-transitioning` attribute **active only during a 350ms window when the theme switches**. During normal operation, component transitions work as expected.",
    },
    keyInsight: {
      ko: "CSS `transition`은 shorthand이므로, 글로벌에서 특정 속성만 지정해도 **컴포넌트의 다른 속성 transition을 전부 제거**합니다. 상시 적용 대신 속성 토글로 필요한 순간에만 활성화해야 합니다.",
      en: "CSS `transition` is a shorthand — specifying just a few properties globally **removes all other property transitions** from components. Use an attribute toggle to activate only when needed.",
    },
  },
  {
    section: { ko: "에디터 / 마크다운", en: "Editor / Markdown" },
    problem: { ko: "마크다운 각주 번호 꼬임 — heading renderer 충돌", en: "Footnote Number Tangling — Heading Renderer Execution Order" },
    definition: {
      ko: "마크다운에서 heading(`# 제목`)과 footnote(`[^1]`)를 함께 사용하면 **각주 번호가 꼬이거나 heading 안의 각주가 변환되지 않았습니다**.",
      en: "Using headings and footnotes together in markdown caused **footnote numbers to tangle or footnotes inside headings to not convert at all**.",
    },
    cause: {
      ko: "커스텀 heading renderer가 `marked-footnote` 확장보다 **먼저 실행**되어, heading 내부의 `[^1]`이 각주로 변환되기 전에 원본 텍스트로 소비되었습니다.",
      en: "The custom heading renderer executed **before** the `marked-footnote` extension, consuming raw `[^1]` text before it could be converted to footnotes.",
    },
    solution: {
      ko: "heading renderer를 제거하고 `postprocess` hook으로 대체. marked-footnote가 **먼저 모든 각주를 처리한 뒤** heading에 `id` 속성만 후처리합니다. `keepLabels: true`로 사용자 입력 번호도 유지합니다.",
      en: "Removed the heading renderer, replaced with a `postprocess` hook. marked-footnote **processes all footnotes first**, then headings get `id` attributes afterward. `keepLabels: true` preserves user-specified numbers.",
    },
    keyInsight: {
      ko: "marked 확장과 커스텀 renderer가 같은 구문을 처리할 때 **실행 순서가 결과를 결정**합니다. renderer 대신 postprocess hook을 사용하면 모든 확장이 먼저 처리됩니다.",
      en: "When marked extensions and custom renderers target the same syntax, **execution order determines the result**. A postprocess hook guarantees all extensions process first.",
    },
  },
  {
    section: { ko: "에디터 / 자동저장", en: "Editor / Auto-save" },
    problem: { ko: "자동저장 — localStorage에서 DB 리비전으로의 진화", en: "Auto-save Evolution from localStorage to DB Revisions" },
    definition: {
      ko: "초기 자동저장은 `localStorage`에 직접 저장했으나, **탭/기기 간 공유 불가**, **새로고침 시 불필요한 저장**, **무시한 리비전 동일 내용 재질문** 등 여러 문제가 복합적으로 발생했습니다.",
      en: "Initial auto-save used `localStorage` directly, but multiple issues compounded: **no cross-tab/device sharing**, **unnecessary saves on refresh**, and **re-prompting after dismissing identical content**.",
    },
    cause: {
      ko: "localStorage의 태생적 한계(브라우저 로컬), ref 초기값 `\"\"`와 `JSON.stringify(form)` 불일치, dismissed 리비전 snapshot 미추적이 복합적으로 작용했습니다.",
      en: "Inherent localStorage limitations (browser-local), ref initial value `\"\"` mismatching `JSON.stringify(form)`, and untracked dismissed revision snapshots all compounded.",
    },
    solution: {
      ko: "3단계 개선: ① localStorage 완전 제거 → **DB `revisions` 테이블을 유일한 저장소**로 변경 ② `lastAutoSaveJson` 초기값을 실제 폼 상태로 설정 ③ dismissed snapshot을 `Set`으로 추적하여 동일 내용 재질문 방지. 페이지 이탈 시 `sendBeacon` + `keepalive: true`로 마지막 상태 보장.",
      en: "3-stage improvement: ① Removed localStorage entirely → **DB `revisions` table as sole storage** ② Set `lastAutoSaveJson` initial value to actual form state ③ Track dismissed snapshots in a `Set` to prevent re-prompting. Page leave uses `sendBeacon` + `keepalive: true` to guarantee final state.",
    },
    keyInsight: {
      ko: "자동저장은 '언제 저장할지'가 아니라 **'언제 저장하지 않을지'가 핵심**입니다. 비교 기준 초기화, 중복 감지, dismissed 추적까지 고려해야 불필요한 리비전 누적을 방지할 수 있습니다.",
      en: "Auto-save isn't about 'when to save' — the key challenge is **'when NOT to save'**. Proper initial value comparison, duplicate detection, and dismissed tracking are all necessary to prevent unnecessary revision accumulation.",
    },
  },
  {
    section: { ko: "에디터 / 직렬화", en: "Editor / Serialization" },
    problem: { ko: "열블록 스타일 round-trip 유실", en: "Column Block Styles Lost on Round-Trip" },
    definition: {
      ko: "2열/3열 레이아웃 블록의 **배경색, 구분선, 열 비율** 등이 richtext→markdown→richtext 변환 시 모두 사라졌습니다.",
      en: "Column layout blocks lost **background color, dividers, and column ratios** when converting between richtext and markdown formats.",
    },
    cause: {
      ko: "Plate Column 노드의 `layout`, `columnBg`, `columnDivider` 같은 커스텀 속성은 표준 HTML에 대응하는 개념이 없어, 단순 `<div>` 변환 시 **커스텀 속성이 모두 탈락**했습니다.",
      en: "Plate Column node custom attributes like `layout`, `columnBg`, `columnDivider` have no standard HTML equivalent, so simple `<div>` conversion **dropped all custom attributes**.",
    },
    solution: {
      ko: "직렬화 시 HTML 주석 + `data-*` 속성으로 이중 인코딩하여 round-trip 보존. 주석이 제거되더라도 `data-*`에서 복원 가능하도록 설계했습니다.",
      en: "Dual encoding with HTML comments + `data-*` attributes during serialization. Even if comments are stripped, recovery is possible from `data-*` attributes.",
    },
    keyInsight: {
      ko: "표준 HTML에 없는 에디터 고유 속성은 직렬화 시 **명시적으로 인코딩**해야 round-trip이 보존됩니다. `data-*` + HTML 주석 이중 저장으로 강건성을 확보할 수 있습니다.",
      en: "Editor-specific attributes not in standard HTML must be **explicitly encoded** during serialization for round-trip preservation. Dual `data-*` + HTML comment storage provides robustness.",
    },
  },
  {
    section: { ko: "에디터 / 미디어", en: "Editor / Media" },
    problem: { ko: "YouTube embed URL — watch URL이 iframe에서 로드 실패", en: "YouTube Embed URL — Watch URL Fails to Load in iframe" },
    definition: {
      ko: "에디터에서 YouTube `watch?v=xxx` URL을 입력하면 에디터 안에서는 보이지만, **게시물 디테일 페이지에서 빈 화면**이 표시되었습니다.",
      en: "Entering a YouTube `watch?v=xxx` URL in the editor displayed correctly inside the editor, but showed **a blank screen on the published post detail page**.",
    },
    cause: {
      ko: "에디터 내부 `parseEmbed()`는 watch→embed 변환을 하지만, `plateSerializer`는 노드의 원본 URL을 그대로 `<iframe src>`에 직렬화합니다. **에디터와 DB 저장 URL이 달라** iframe이 로드에 실패했습니다.",
      en: "The editor's `parseEmbed()` converts watch→embed URLs, but `plateSerializer` serializes the node's original URL into `<iframe src>` as-is. **The editor and DB URLs diverged**, causing iframe load failures.",
    },
    solution: {
      ko: "`fixEmbedUrls()` 유틸리티로 HTML 렌더링 직전에 **iframe src의 watch/shorts URL을 embed URL로 일괄 변환**. 디테일 페이지와 미리보기 양쪽에 적용했습니다.",
      en: "Created `fixEmbedUrls()` utility to **bulk-convert iframe src watch/shorts URLs to embed URLs** just before HTML rendering. Applied to both detail and preview pages.",
    },
    keyInsight: {
      ko: "에디터 런타임 변환과 직렬화 사이의 **URL 불일치**는 '에디터에서는 보이는데 실제 페이지에서 안 보이는' 버그를 만듭니다. 렌더링 직전 URL 정규화 후처리로 해결할 수 있습니다.",
      en: "A URL mismatch between editor runtime conversion and serialization creates 'works in editor, broken on page' bugs. A URL normalization post-processing step before rendering resolves this.",
    },
  },
  {
    section: { ko: "에디터 / UI", en: "Editor / UI" },
    problem: { ko: "커스텀 커서 리사이즈 모드에서 마우스 방향에 따라 커서 회전", en: "Custom Cursor Rotates with Mouse Direction in Resize Mode" },
    definition: {
      ko: "이미지·열블록 리사이즈 핸들에 커스텀 커서(↔, ↕, ⤡)를 적용했더니, **마우스 이동 방향에 따라 커서가 회전·찌그러짐**이 발생했습니다.",
      en: "After applying custom cursors (↔, ↕, ⤡) to image/column resize handles, **the cursor rotated and distorted** based on mouse movement direction.",
    },
    cause: {
      ko: "CursorTrail 애니메이션 루프가 마우스 속도 기반 `angleRef`(회전)·`scaleRef`(스케일)를 계산하는데, 리사이즈 모드 진입 시 이전 값이 남아있었고, classList 기반 감지는 React 렌더 타이밍과 1~2프레임 어긋났습니다.",
      en: "The CursorTrail animation loop calculated `angleRef`/`scaleRef` from mouse velocity, but previous values persisted on resize entry. classList-based detection was also 1-2 frames behind React render timing.",
    },
    solution: {
      ko: "`cursorTypeRef`(동기 ref)를 추가하여 `setCursorType`과 동시에 갱신하고, 리사이즈 진입 시 즉시 리셋. 애니메이션 루프에서 ref로 리사이즈 여부를 판단하여 회전·스케일을 비활성화했습니다.",
      en: "Added `cursorTypeRef` (synchronous ref) updated with `setCursorType`, immediately resetting on resize entry. The animation loop checks the ref to disable rotation/scale in resize mode.",
    },
    keyInsight: {
      ko: "React state 기반 감지는 렌더 지연이 있으므로, **requestAnimationFrame 루프에서는 동기 ref**를 사용해야 프레임 정확도를 보장할 수 있습니다.",
      en: "React state detection has render delays, so **synchronous refs are needed in requestAnimationFrame loops** to guarantee frame-accurate detection.",
    },
  },
  {
    section: { ko: "에디터 / 이미지", en: "Editor / Image" },
    problem: { ko: "이미지 리사이즈 핸들 클릭 시 이미지가 삭제됨", en: "Image Resize Handle Click Deletes Image" },
    definition: {
      ko: "인라인 이미지의 리사이즈 핸들을 클릭하면 **리사이즈가 아닌 이미지 삭제**(DnD 드롭)가 발생했습니다.",
      en: "Clicking an inline image's resize handle triggered **image deletion (DnD drop)** instead of resize.",
    },
    cause: {
      ko: "인라인 이미지의 `onPointerDown`이 DnD 드래그를 시작하는데, 리사이즈 핸들 위의 클릭도 가로채서 드래그→드롭으로 처리했습니다.",
      en: "The inline image's `onPointerDown` initiates DnD drag, intercepting resize handle clicks and processing them as drag→drop.",
    },
    solution: {
      ko: "`closest(\"[data-cursor^='resize']\")` 체크로 리사이즈 핸들 클릭 시 DnD 비활성화. 히트박스와 시각적 핸들을 별개 sibling으로 분리하여 독립 조정이 가능하도록 했습니다.",
      en: "Added `closest(\"[data-cursor^='resize']\")` check to disable DnD on resize handle clicks. Separated hitboxes and visual handles into independent siblings for independent positioning.",
    },
    keyInsight: {
      ko: "인라인 void 요소에서 **DnD와 리사이즈는 동일한 포인터 이벤트를 공유**하므로, 이벤트 타겟 기반 분기가 필수적입니다.",
      en: "In inline void elements, **DnD and resize share the same pointer events**, making event-target-based branching essential.",
    },
  },
  {
    section: { ko: "에디터 / UI", en: "Editor / UI" },
    problem: { ko: "에디터 툴바 active 상태 — wrapper 블록 감지 실패", en: "Editor Toolbar Active State — Wrapper Block Detection Failure" },
    definition: {
      ko: "blockquote, code block, table 안에 커서를 놓아도 **메인 툴바의 해당 버튼이 active 스타일로 바뀌지 않았습니다**.",
      en: "Placing cursor inside blockquote, code block, or table **didn't activate the corresponding toolbar button**.",
    },
    cause: {
      ko: "`useBlockInfo` 훅이 `editor.api.block()`으로 가장 가까운 블록을 가져오는데, wrapper 블록 안의 자식 블록(`p`, `code_line`)이 먼저 반환되어 실제 블록 타입과 불일치했습니다.",
      en: "`useBlockInfo` uses `editor.api.block()` to get the nearest block, but child blocks (`p`, `code_line`) inside wrapper blocks are returned first, mismatching the actual block type.",
    },
    solution: {
      ko: "`blockType`이 `p`/`code_line`일 때 `editor.api.above()`로 `[\"blockquote\", \"code_block\", \"table\"]`을 순회하여 상위 wrapper 블록을 탐색하고 `blockType`을 갱신했습니다.",
      en: "When `blockType` is `p`/`code_line`, traverse `[\"blockquote\", \"code_block\", \"table\"]` via `editor.api.above()` to find parent wrapper blocks and update `blockType`.",
    },
    keyInsight: {
      ko: "Slate 에디터에서 **`api.block()`은 leaf-level 블록을 반환**하므로, nested 구조에서는 `api.above()`로 wrapper를 별도 탐색해야 합니다.",
      en: "In Slate editors, **`api.block()` returns leaf-level blocks**, so nested structures require separate `api.above()` traversal for wrapper detection.",
    },
  },
  {
    section: { ko: "에디터 / 각주", en: "Editor / Footnote" },
    problem: { ko: "각주 참조/내용 정합성 — 한쪽 삭제 시 고아 노드 잔존", en: "Footnote Ref/Content Integrity — Orphan Nodes After Partial Deletion" },
    definition: {
      ko: "각주 참조(`footnote_ref`)를 삭제해도 하단 각주 내용이 남아있고, 반대의 경우도 마찬가지였습니다.",
      en: "Deleting a footnote reference left the content block at the bottom, and vice versa.",
    },
    cause: {
      ko: "Plate의 `normalizeNode`는 `footnoteId` 기반 연결 관계를 인식하지 못하여 한쪽 삭제 시 다른 쪽이 유지되었습니다.",
      en: "Plate's `normalizeNode` doesn't recognize `footnoteId`-based relationships, so deleting one side left the other intact.",
    },
    solution: {
      ko: "별도 `useEffect` + 300ms debounce로 고아 노드를 역순 삭제. `normalizeNode` 내부에서 직접 삭제 시 path 에러가 발생하여 effect로 분리했습니다.",
      en: "Separate `useEffect` with 300ms debounce deletes orphan nodes in reverse order. Direct deletion inside `normalizeNode` caused path errors, requiring the effect-based approach.",
    },
    keyInsight: {
      ko: "`normalizeNode` 안에서 다른 노드를 삭제하면 **path shift로 인해 `Cannot find a descendant` 에러**가 발생합니다. 비동기 effect로 분리하면 안전합니다.",
      en: "Deleting other nodes inside `normalizeNode` causes **`Cannot find a descendant` errors due to path shifts**. Separating into an async effect is safer.",
    },
  },
  {
    section: { ko: "에디터 / 링크", en: "Editor / Link" },
    problem: { ko: "링크 클릭 시 즉시 이동 — 에디터에서 링크 편집 불가", en: "Link Click Immediately Navigates — Cannot Edit Links in Editor" },
    definition: {
      ko: "에디터 안의 링크를 클릭하면 즉시 새 탭으로 이동하여 **URL 수정이나 텍스트 편집이 불가능**했습니다.",
      en: "Clicking a link in the editor immediately opened a new tab, making **URL editing or text changes impossible**.",
    },
    cause: {
      ko: "`LinkElement`의 `onClick`이 `window.open()`을 바로 호출하여 에디터 내 커서 배치가 불가능했습니다.",
      en: "`LinkElement`'s `onClick` directly called `window.open()`, preventing cursor placement inside the link.",
    },
    solution: {
      ko: "클릭 → 링크 편집 툴바 자동 표시, 더블클릭 → 새 탭 이동. `currentLinkKey`(path 기반)로 링크→링크 이동 시 깜빡임 방지 + 에디터 본문 클릭을 무시하는 커스텀 outside-click 핸들러 적용.",
      en: "Single click shows link edit toolbar, double click navigates. `currentLinkKey` (path-based) prevents flickering on link-to-link navigation + custom outside-click handler ignores editor content clicks.",
    },
    keyInsight: {
      ko: "에디터 내 인터랙티브 요소는 **클릭=편집, 더블클릭=실행** 패턴이 자연스럽습니다. `useOutsideClick`은 에디터 본문 클릭도 '바깥'으로 감지하므로 커스텀 핸들러가 필요합니다.",
      en: "For interactive elements in editors, **click=edit, double-click=execute** is the natural pattern. `useOutsideClick` detects editor content clicks as 'outside', requiring a custom handler.",
    },
  },
  {
    section: { ko: "CSS / 디자인 토큰", en: "CSS / Design Tokens" },
    problem: { ko: "CSS 토큰 미정의 — 11개 파일에서 참조하지만 선언 없음", en: "Undefined CSS Token — Referenced in 11 Files but Never Declared" },
    definition: {
      ko: "`--box-3xs-xs` 토큰을 11개 CSS 파일에서 `padding: var(--box-3xs-xs)`로 사용하고 있었지만, `_spacing.css`에 실제 정의가 없어 **해당 padding이 모두 무시**되고 있었습니다.",
      en: "The `--box-3xs-xs` token was used as `padding: var(--box-3xs-xs)` across 11 CSS files, but was **never defined** in `_spacing.css` — causing all those paddings to silently fail.",
    },
    cause: {
      ko: "CSS 토큰 감사 과정에서 `padding: var(--spacing-3xs) var(--spacing-xs)` (2px 8px)를 box shorthand `var(--box-3xs-xs)`로 일괄 치환했으나, `_spacing.css`의 Compound 블록에 해당 토큰 정의를 추가하지 않았습니다. CSS `var()`는 미정의 시 오류 없이 해당 선언을 무효화하므로 **빌드·타입체크에서 감지되지 않았습니다**.",
      en: "During a CSS token audit, `padding: var(--spacing-3xs) var(--spacing-xs)` (2px 8px) was batch-replaced with the box shorthand `var(--box-3xs-xs)`, but the token definition was never added to the Compound block in `_spacing.css`. CSS `var()` silently invalidates declarations when undefined — **undetectable by build or typecheck**.",
    },
    solution: {
      ko: "`_spacing.css`에 `--box-3xs-xs: var(--spacing-3xs) var(--spacing-xs)` 정의를 추가했습니다. 향후 토큰 치환 시 **사용 파일 grep → 정의 파일 확인** 2단계 검증을 수행합니다.",
      en: "Added `--box-3xs-xs: var(--spacing-3xs) var(--spacing-xs)` to `_spacing.css`. Future token replacements follow a two-step verification: **grep for usage → confirm definition exists**.",
    },
    keyInsight: {
      ko: "CSS custom property는 **미정의 시 silent fail** — 해당 선언만 무효화되고 에러가 발생하지 않습니다. 토큰 일괄 치환 후 반드시 **정의 존재 여부를 역검증**해야 합니다. stylelint의 `custom-property-no-missing-var-declare` 규칙을 도입하면 CI에서 자동 감지할 수 있습니다.",
      en: "CSS custom properties **silently fail when undefined** — declarations are invalidated without errors. After batch token replacement, always **reverse-verify that definitions exist**. stylelint's `custom-property-no-missing-var-declare` rule can catch this in CI.",
    },
  },
  {
    section: { ko: "Frontend / Performance", en: "Frontend / Performance" },
    problem: { ko: "LoadingScreen이 SSR에 포함되지 않아 콘텐츠 flash 발생", en: "LoadingScreen Not Included in SSR — Content Flash Before Loading" },
    definition: {
      ko: "페이지 로드 시 콘텐츠가 잠깐 보인 후에 로딩 화면(검은 배경)이 나타났습니다. design-system 등 클라이언트 렌더링 비중이 큰 페이지에서 특히 눈에 띄었습니다.",
      en: "Page content briefly flashed before the loading screen (black backdrop) appeared. Especially noticeable on client-heavy pages like design-system.",
    },
    cause: {
      ko: "`LoadingScreen`이 `ClientOverlays` 안에서 `dynamic(() => import(...), { ssr: false })`로 불러와져 **서버 HTML에 포함되지 않았습니다**. 브라우저가 JS 번들을 로드하고 React 하이드레이션이 완료된 후에야 `LoadingScreen`이 마운트되어, 그 사이 콘텐츠가 노출되었습니다.",
      en: "`LoadingScreen` was loaded inside `ClientOverlays` using `dynamic(() => import(...), { ssr: false })`, **excluding it from server HTML**. The browser displayed page content immediately, and `LoadingScreen` only mounted after JS bundle load + React hydration.",
    },
    solution: {
      ko: "`LoadingScreen`만 일반 `import`로 변경하여 서버 HTML에 포함되도록 수정했습니다. `useLoadingScreen()` 훅의 초기값이 `isLoading: true`이므로 SSR 시점에 `opacity: 1` 검은 배경이 HTML에 포함됩니다. 나머지 오버레이(Modal, CursorTrail 등)는 서버 렌더가 불필요하므로 `ssr: false` 유지.",
      en: "Changed `LoadingScreen` to a regular `import` so it's included in server HTML. Since `useLoadingScreen()` initializes with `isLoading: true`, the black backdrop renders at `opacity: 1` in SSR output. Other overlays (Modal, CursorTrail) remain `ssr: false`.",
    },
    keyInsight: {
      ko: "`dynamic({ ssr: false })`는 서버 HTML에서 **완전히 제외**됩니다. 로딩 화면처럼 **초기 렌더 시 반드시 보여야 하는 컴포넌트**는 SSR에 포함시키고, 초기값으로 올바른 상태를 렌더해야 합니다. `useState` 초기값이 서버와 클라이언트에서 동일하면 하이드레이션 불일치 없이 안전합니다.",
      en: "`dynamic({ ssr: false })` **completely excludes** the component from server HTML. Components that **must be visible on initial render** (like loading screens) should be included in SSR, with correct initial state. If `useState` initializer returns the same value on server and client, there's no hydration mismatch.",
    },
  },
  {
    section: { ko: "Frontend / CSS", en: "Frontend / CSS" },
    problem: {
      ko: "CTA 버튼 `backdrop-filter`가 Chrome에서 동작하지 않음",
      en: "CTA Button `backdrop-filter` Not Working in Chrome",
    },
    definition: {
      ko: "CTA 섹션의 컨택트/이력서 버튼에 `backdrop-filter: blur()`를 적용했는데, Chrome에서 **호버 시 blur 효과가 전혀 보이지 않고** 배경 tint만 약하게 표시됐습니다. DevTools 컴퓨티드에서 속성은 분명히 적용돼 있는데 실제 샘플링이 안 됐습니다.",
      en: "Applied `backdrop-filter: blur()` to the CTA contact/resume buttons, but in Chrome the **blur effect wasn't visible on hover** — only the faint background tint showed. DevTools Computed showed the property applied, yet the backdrop wasn't being sampled.",
    },
    cause: {
      ko: "홈 페이지 진입 애니메이션이 `.home` 래퍼에 `y: '100vh' → 0` 형태의 **transform 기반**이었습니다. 애니메이션이 끝나도 framer-motion이 `transform: translate3d(0,0,0)`와 `will-change`를 유지하는 바람에 `.home`이 자체 **compositing layer**로 승격되었고, 하위 요소의 `backdrop-filter`가 그 layer 경계 너머의 배경(커피 canvas)을 샘플링할 수 없게 됐습니다. 추가로 `-webkit-backdrop-filter` 접두사가 Chrome의 파싱을 꼬이게 만들어 더욱 동작을 저해했습니다.",
      en: "The homepage entrance animation used a `transform`-based `y: '100vh' → 0` on the `.home` wrapper. Even after the animation finished, framer-motion kept the `transform: translate3d(0,0,0)` and `will-change` hint, which promoted `.home` into its own **compositing layer**. Any child's `backdrop-filter` could no longer sample the backdrop beyond that layer (the coffee canvas below). Additionally, the `-webkit-backdrop-filter` prefix disrupted Chrome's parsing and aggravated the failure.",
    },
    solution: {
      ko: "진입 애니메이션을 `y(transform)` → `marginTop(layout)`으로 교체했습니다. layout 기반 속성은 compositing layer를 만들지 않기 때문에 하위 요소의 `backdrop-filter`가 정상적으로 배경을 샘플링합니다. 또한 `.home`의 `border-radius` + `overflow-x: clip` 조합도 제거해 불필요한 layer 승격 요인을 줄이고, `-webkit-backdrop-filter` 접두사는 삭제했습니다 (Chrome은 표준 `backdrop-filter`만 사용).",
      en: "Swapped the entrance animation from `y` (transform) to `marginTop` (layout). Layout-based properties don't promote a compositing layer, so descendants' `backdrop-filter` can sample the backdrop normally. Also removed `.home`'s `border-radius` + `overflow-x: clip` combination to eliminate another promotion trigger, and dropped the `-webkit-backdrop-filter` prefix entirely (Chrome uses the standard property only).",
    },
    keyInsight: {
      ko: "`backdrop-filter`는 요소와 **동일한 compositing layer 내의 backdrop만** 샘플링할 수 있습니다. 상위 조상 중 하나라도 `transform`, `will-change: transform`, `filter`, `mask`, `isolation: isolate` 등으로 layer를 승격시키면 그 layer 경계 이전의 배경은 보이지 않게 됩니다. 버튼 hover처럼 국소적인 blur가 필요할 때는 **조상 경로에 layer 승격 속성이 없는지** 먼저 검증해야 하고, transform 기반 애니메이션은 훑고 지나간 뒤에도 compositing 힌트를 남기는 경우가 많으므로 **layout 속성으로 대체할 수 있는지 고민**해야 합니다.",
      en: "`backdrop-filter` can only sample the backdrop **within the same compositing layer** as the element. If any ancestor promotes itself via `transform`, `will-change: transform`, `filter`, `mask`, `isolation: isolate`, etc., the backdrop beyond that boundary disappears. For localized effects like hover blur, first verify **no ancestor in the chain has a layer-promoting property**. Transform-based animations often leave compositing hints behind, so consider whether **layout-based properties (margin, padding, width)** can replace them.",
    },
  },
  {
    section: { ko: "Frontend / Editor", en: "Frontend / Editor" },
    problem: {
      ko: "Plate 인라인 코드에서 방향키 커서 점프",
      en: "Plate Inline Code Arrow Key Cursor Jump",
    },
    definition: {
      ko: "인라인 코드(`<code>` mark) 안에서 ArrowLeft로 두 번째 글자에서 첫 번째 글자로 이동할 때 커서가 이전 텍스트 노드로 점프함",
      en: "When pressing ArrowLeft to move from the second to the first character inside an inline code (`<code>` mark), the cursor jumped to the previous text node",
    },
    cause: {
      ko: "CodePlugin.configure({ rules: { selection: { affinity: \"directional\" } } })로 Plate 기본값 \"hard\"를 덮어씀. \"hard\" affinity는 mark 경계에서 커서를 mark 안쪽에 유지하는데, \"directional\"은 브라우저 기본 동작에 위임하여 `<code>` 요소의 padding/border 경계에서 커서가 요소 밖으로 점프",
      en: "CodePlugin was configured with { rules: { selection: { affinity: \"directional\" } } }, overriding Plate's default \"hard\". \"hard\" affinity keeps the cursor inside mark boundaries, while \"directional\" delegates to browser default behavior, causing the cursor to jump outside the `<code>` element at padding/border boundaries",
    },
    solution: {
      ko: "affinity 오버라이드를 제거하고 Plate 기본값(\"hard\")을 사용. 디버깅 과정에서 DOM selection API, normalizer merge, CSS padding 제거 등 여러 접근을 시도했으나 근본 원인은 affinity 설정",
      en: "Removed the affinity override, using Plate's default (\"hard\"). During debugging, tried DOM selection API, normalizer merge, CSS padding removal, but the root cause was the affinity configuration",
    },
    keyInsight: {
      ko: "Plate/Slate에서 inline mark의 커서 동작은 **affinity 설정**이 결정합니다. \"hard\"는 mark 경계에서 커서를 안쪽에 유지하고, \"directional\"은 브라우저에 위임하여 padding/border가 있는 요소에서 예기치 않은 점프가 발생할 수 있습니다. 플러그인 설정을 오버라이드할 때는 **기본값이 왜 그렇게 설정되었는지** 먼저 이해해야 합니다.",
      en: "In Plate/Slate, cursor behavior at inline mark boundaries is controlled by the **affinity setting**. \"hard\" keeps the cursor inside the mark, while \"directional\" delegates to the browser, which can cause unexpected jumps at elements with padding/border. Before overriding plugin defaults, **understand why the default was chosen**.",
    },
    tags: ["Plate", "Slate", "code mark", "cursor", "affinity"],
  },
  {
    section: { ko: "Frontend / Admin", en: "Frontend / Admin" },
    problem: {
      ko: "Admin 테이블 모바일 가로 스크롤 시 row border가 중간에서 끊김",
      en: "Admin Table Row Border Cuts Off Mid-Scroll on Mobile",
    },
    definition: {
      ko: "모바일에서 admin 테이블을 가로 스크롤할 때, 행과 행 사이 구분선(border-bottom)이 **스크롤 끝까지 그려지지 않고 중간에서 끊기는** 현상이 발생했습니다.",
      en: "When horizontally scrolling admin tables on mobile, the row separator lines (border-bottom) **stopped mid-scroll instead of extending across the full scroll area**.",
    },
    cause: {
      ko: "모바일 표시를 위해 `.colTitle { min-width: 280px }`으로 제목 열 너비를 확보했는데, 각 row(`.row`, `.tableHeader`, `.bulkBar`)는 **독립된 grid 컨테이너**이므로 trac 확장이 행마다 따로 계산됐습니다. 데이터 row에는 `col.className`이 적용되어 있어 title track이 280px로 확장되었지만, header의 title `<span>`에는 className이 없어 1fr만 계산됨 → **row는 868px로 늘어나고 header는 720px에서 끝나는 너비 불일치**. 스크롤 시 row의 border는 868px까지 그려지지만 header와 bulkBar의 border는 720px에서 끊겨 보였습니다.",
      en: "To guarantee a readable title column on mobile, `.colTitle { min-width: 280px }` was applied. But each row (`.row`, `.tableHeader`, `.bulkBar`) is an **independent grid container**, so track expansion is computed per-row. Data rows had `col.className` applied, so the title track expanded to 280px — but the header's title `<span>` had no className, leaving the 1fr track at its natural size. **Rows grew to 868px while the header stayed at 720px**. On scroll, row borders extended to 868px but the header/bulkBar borders stopped at 720px, making the separator lines look truncated.",
    },
    solution: {
      ko: "두 가지 동시 수정. ① 헤더 `<span>`에도 `col.className`을 적용해 `.colTitle`이 header title에도 적용되게 하여 **header title track도 280px로 확장**. ② 스크롤 컨테이너 내부에 `.tableInner` wrapper(`display: flex; flex-direction: column; min-width: 100%; width: max-content;`)를 추가. flex column에서 items는 cross-axis(가로)로 자동 stretch되고, `width: max-content`가 가장 넓은 자식의 max-content 너비(868px)로 wrapper를 사이징하므로 **모든 row/header/bulkBar가 동일한 868px로 정렬**됩니다. 결과적으로 border-bottom이 스크롤 전 영역에 걸쳐 연결되어 그려집니다.",
      en: "Two simultaneous fixes. ① Apply `col.className` to the header `<span>` too so `.colTitle` applies in the header, **expanding the header's title track to 280px**. ② Add a `.tableInner` wrapper (`display: flex; flex-direction: column; min-width: 100%; width: max-content;`) inside the scroll container. In a flex column, items auto-stretch on the cross-axis (horizontal), and `width: max-content` sizes the wrapper to the widest child's max-content (868px), **aligning all rows/header/bulkBar to the same 868px width**. Border-bottom now extends continuously across the full scroll area.",
    },
    keyInsight: {
      ko: "CSS Grid에서 각 row가 독립된 grid 컨테이너이면 **track 확장은 row별로 계산**되어 하나의 row에서 min-width가 걸려도 다른 row에는 반영되지 않습니다. 가로 스크롤 시 border 연속성을 유지하려면 모든 row가 **동일한 전체 너비**를 가져야 하고, 이를 위해 `width: max-content + min-width: 100%` 패턴의 wrapper로 가장 넓은 자식에 맞춰 통일된 너비를 강제해야 합니다. 또한 `col.className`처럼 **row에만 적용되고 header에는 빠진 className 불일치**가 너비 차이의 가장 흔한 원인이므로, header 렌더링 경로도 동일 className을 받도록 해야 합니다.",
      en: "When each row is an independent CSS Grid container, **track expansion is computed per-row** — a `min-width` on one row's cell doesn't propagate to siblings. For horizontal scroll with continuous borders, all rows must share the **same overall width**. The `width: max-content + min-width: 100%` wrapper pattern enforces this by sizing the wrapper to the widest child. Additionally, **className mismatches between row and header** (where `col.className` is applied in rows but omitted in headers) are a common source of width divergence — ensure the header render path receives the same className.",
    },
    tags: ["CSS Grid", "flex", "overflow-x", "max-content", "mobile", "admin"],
  },
  {
    section: { ko: "Frontend / Transition", en: "Frontend / Transition" },
    problem: {
      ko: "Page transition 이 hold 단계에서 멈추고 morph 후 skeleton 이 노출",
      en: "Page transition stuck at hold + skeleton exposed after morph",
    },
    definition: {
      ko: "PostCard → 포스트 상세로 이동할 때, **이미지가 hero 크기로 축소된 뒤 오버레이가 사라지지 않고 영원히 hold 상태로 남았습니다**. 추가로 축소 직후 그 아래로 `loading.tsx` 의 스켈레톤이 잠깐 그대로 보여 \"이미지가 작아지는 애니메이션 동작하고 또 skeleton ui 가 오래 동작\" 하는 어색한 시퀀스가 발생했습니다.",
      en: "Navigating from a PostCard to a post detail, **the overlay morphed down to hero size and then never dismissed — it stayed in the hold phase forever**. Worse, immediately after the morph the `loading.tsx` skeleton was visible beneath the now-smaller overlay, producing an awkward sequence: \"image shrinks, then the skeleton lingers for a long time.\"",
    },
    cause: {
      ko: "두 가지가 겹쳐 있었습니다. ① 원래 설계는 expand → morph(히어로 크기) → hold 로 자동 진행하고, DetailLayout 의 hero `motion.div` 에 걸린 `onAnimationStart` 콜백에서 `endTransition()` 을 호출해 dismissal 을 트리거하는 구조였습니다. 그런데 `initial={{ opacity: isTransitioning ? 1 : 0 }}` 와 `animate={{ opacity: 1 }}` 가 isTransitioning=true 일 때 둘 다 1 → framer-motion 이 \"값 변화 없음\" 으로 판정해 **onAnimationStart 콜백이 발화되지 않음**. 그래서 phase 가 영원히 \"hold\" 에 머물렀습니다. ② morph 가 클릭 후 약 1초 시점에 고정 타이밍으로 수행되어, **새 페이지가 준비되기 전에 오버레이가 작아져버렸습니다**. Suspense fallback 인 `loading.tsx` 가 morph 직후 그 자리를 차지해 노출됐습니다.",
      en: "Two issues compounded. ① The original design auto-progressed expand → morph (hero size) → hold and triggered dismissal via an `onAnimationStart` callback on the DetailLayout's hero `motion.div`. But with `initial={{ opacity: isTransitioning ? 1 : 0 }}` and `animate={{ opacity: 1 }}`, when isTransitioning was true both equaled `1` — framer-motion treats this as a no-op and **never fires onAnimationStart**, so the phase stayed at \"hold\" forever. ② The morph ran on a fixed timer (~1s after click), shrinking the overlay **before the new page was ready**. With the Suspense fallback (`loading.tsx`) underneath, the skeleton was exposed the moment the morph completed.",
    },
    solution: {
      ko: "전환 상태 머신을 재설계했습니다. 자동 진행은 expand → morph → hold 까지 그대로 두되, **hold 단계에서 backdrop 을 fullscreen 으로 유지**해 morph 후에도 화면 전체를 덮어 스켈레톤을 가립니다 (이전엔 backdrop 도 hero 영역만 채웠음). dismissal 트리거는 `onAnimationStart` 의존을 제거하고 **DetailLayout 의 `useEffect` 에서 mount 시 `endTransition()` 을 호출**하도록 변경. 추가로 `SAFETY_MS=5000` 안전망 타이머를 PageTransitionProvider 에 두어 어떤 이유로든 endTransition 이 호출되지 않으면 강제 dismiss. 빠른 mount(데이터 캐시 hit) 케이스를 위해 `endRequestedRef` 를 두어 expand/morph 진행 중에 endTransition 이 호출되면 hold 를 건너뛰고 완료 시점에 곧장 done 으로 진입.",
      en: "Restructured the transition state machine. Auto-progression of expand → morph → hold stays, but **the backdrop now remains fullscreen during hold**, covering everything beneath the morphed overlay so the skeleton can't surface (previously the backdrop only filled the hero area). The dismissal trigger no longer depends on `onAnimationStart` — instead, **a `useEffect` in DetailLayout calls `endTransition()` on mount**. A `SAFETY_MS=5000` backstop timer in PageTransitionProvider force-dismisses if `endTransition` isn't called for any reason. For fast cached mounts, an `endRequestedRef` lets `endTransition` calls during expand/morph short-circuit hold and proceed straight to done when the current phase completes.",
    },
    keyInsight: {
      ko: "두 가지 교훈. ① **애니메이션 라이프사이클 콜백(onAnimationStart, onAnimationComplete) 을 critical state transition 의 단독 트리거로 사용하면 안 됩니다.** initial===animate 와 같은 \"값 변화 없음\" 케이스에서 발화하지 않을 수 있고, 라이브러리 버전·렌더링 타이밍에 따라 silent failure 가 가능합니다. 항상 useEffect 기반 fallback 이나 setTimeout 안전망과 함께 설계해야 합니다. ② Suspense fallback 이 있는 환경에서 \"morph-into-hero\" 같은 모핑 전환을 설계할 때는 **오버레이가 축소되면 그 아래가 노출된다는 시각 계약을 항상 의식**해야 합니다. 새 페이지가 준비되기 전에 morph 가 끝나면 스켈레톤이 노출되어 디자인이 깨지므로, 해결책은 (a) **backdrop 으로 morph 후에도 화면 전체를 덮어두기**, 또는 (b) **새 페이지 mount 시점까지 morph 를 지연** 하는 두 가지뿐입니다. 두 패턴 모두 \"오버레이 시각이 실제 페이지 상태와 동기화되도록\" 보장하는 게 핵심입니다.",
      en: "Two lessons. ① **Animation lifecycle callbacks (onAnimationStart, onAnimationComplete) should not be the sole trigger for critical state transitions.** They can silently fail when initial equals animate (no-op cases), and behavior varies by library version and render timing. Always pair them with a useEffect-based fallback or a setTimeout safety net. ② When designing \"morph-into-hero\" transitions in a Suspense-aware environment, **always remember the visual contract: shrinking the overlay reveals what's beneath**. If morph completes before the new page is ready, the skeleton is exposed and the design breaks. The only fixes are (a) **keep the backdrop covering the full viewport even after morph**, or (b) **defer morph until the new page mounts**. Both patterns enforce \"overlay visuals stay synchronized with actual page state.\"",
    },
    tags: ["framer-motion", "transition", "suspense", "skeleton", "lifecycle"],
  },
  {
    section: { ko: "Frontend / Layout", en: "Frontend / Layout" },
    problem: {
      ko: "Posts Bento — `grid-template-rows` 만으로는 카드별 높이 차이가 빈칸을 만듦",
      en: "Posts Bento — `grid-template-rows` alone leaves gaps when card heights vary",
    },
    definition: {
      ko: "`/posts` bento 레이아웃이 wide / banner(21:9) / square(1:1) / portrait(3:4) / standard 5종 variant 를 섞어 쓰는데, 일반 CSS Grid 로는 row track 이 가장 큰 카드 기준으로 잡혀 작은 카드 옆에 **빈 셀**이 생깁니다. `grid-auto-flow: dense` 만으로는 high-aspect 카드의 잔여 공간을 메우지 못합니다.",
      en: "The `/posts` bento mixes five variants — wide / banner (21:9) / square (1:1) / portrait (3:4) / standard. With plain CSS Grid, row tracks stretch to the tallest card in that row, leaving **empty cells** beside smaller cards. `grid-auto-flow: dense` alone can't backfill the leftover vertical space when card aspect ratios differ widely.",
    },
    cause: {
      ko: "`grid-template-rows: auto` 또는 고정 비율로 row 를 정의하면 한 row 안의 모든 셀이 가장 큰 자식 높이로 정렬됩니다. 작은 카드(square)와 큰 카드(portrait) 가 같은 row 에 들어가면 square 아래에 portrait 와의 높이 차만큼 dead space 가 발생합니다.",
      en: "`grid-template-rows: auto` (or any fixed ratio) sizes a row to the tallest child, so a square next to a portrait leaves dead space below the square equal to the height delta.",
    },
    solution: {
      ko: "진짜 masonry 를 JS + CSS Grid hybrid 로 구현. CSS 에서는 `grid-auto-rows: 1px` 로 row track 을 픽셀 단위까지 잘게 쪼개고 `grid-auto-flow: dense` + `gap` 만 지정합니다. JS 의 `useEffect` 에서 모든 카드의 `firstElementChild.scrollHeight` 를 측정해 `span = ceil((h + gap) / (rowUnit + gap))` 을 계산하고 각 카드에 `style.gridRow = span N` 을 부여합니다. 폰트/이미지 로드 시점에 다시 계산하기 위해 ResizeObserver(grid) + 이미지 onLoad 두 곳에서 재계산하고, 모바일(`<= 640px`)에서는 모든 variant 를 비활성화 + 단일 16:10 비율로 통일해 JS 측정도 비활성화합니다.",
      en: "Implement true masonry as a JS + CSS Grid hybrid. CSS uses `grid-auto-rows: 1px` to shred row tracks to a fine pixel unit, plus `grid-auto-flow: dense` and `gap` only. A `useEffect` measures every card's `firstElementChild.scrollHeight`, computes `span = ceil((h + gap) / (rowUnit + gap))`, and assigns `style.gridRow = span N`. Recalculation runs on both `ResizeObserver(grid)` and image `onLoad` so font/image loads can't leave stale spans. On mobile (`<= 640px`), all variants flatten to a uniform 16:10 ratio and JS measurement is disabled.",
    },
    keyInsight: {
      ko: "CSS-only masonry 는 still 실험적 — `grid-template-rows: masonry` 는 Chrome 미지원입니다. 안정적으로 빈틈 없이 packing 하려면 **row track 을 픽셀 단위로 쪼갠 뒤 JS 가 측정한 높이로 span 을 부여**하는 패턴이 사실상 표준입니다. 측정은 `firstElementChild.scrollHeight` 가 가장 정확하고(컨테이너 자체의 padding 영향 없음), 이미지 onLoad / ResizeObserver 두 시점에 모두 재계산해야 폰트·이미지 로드 이전 잘못 잡힌 높이가 보정됩니다.",
      en: "CSS-only masonry is still experimental — `grid-template-rows: masonry` isn't shipped in Chrome. The de facto standard for gap-free packing is **shred row tracks to a fine pixel unit, then have JS assign spans from measured heights**. `firstElementChild.scrollHeight` is the most accurate source (immune to wrapper padding), and you must recompute on both image `onLoad` and `ResizeObserver` to correct heights captured before fonts/images settled.",
    },
    tags: ["CSS Grid", "masonry", "ResizeObserver", "bento", "Posts"],
  },
  {
    section: { ko: "Frontend / Layout", en: "Frontend / Layout" },
    problem: {
      ko: "sticky filterBar IntersectionObserver — 인기글 사이드바와 1px 어긋남",
      en: "Sticky filterBar IntersectionObserver — 1px drift against sidebar widgets",
    },
    definition: {
      ko: "`/posts` 의 filterBar 가 `position: sticky; top: var(--nav-height)` 로 붙는데, sentinel 의 IntersectionObserver `rootMargin` 을 고정값으로 두면 PC ↔ 모바일에서 nav 높이가 바뀌거나 filterBar 가 1행 → 2행으로 늘어나는 순간 anchor 시점이 어긋나 인기글 위젯과 1px 정도 겹치거나 떨어져 보입니다.",
      en: "`/posts` filterBar uses `position: sticky; top: var(--nav-height)`, but the sentinel's `rootMargin` was hard-coded. When PC ↔ mobile nav heights differ or the filterBar grows from one row to two, the anchor moment falls out of sync — the bar visually overlaps Popular Posts by ~1px or leaves a hairline gap.",
    },
    cause: {
      ko: "sticky `top` 은 CSS variable 로 동적이지만 IntersectionObserver `rootMargin` 은 객체 생성 시점의 정적 값입니다. filterBar height 가 search row 추가로 44px → 80px 로 변하면 sentinel 이 가리는 영역도 같이 변해야 하는데 observer 가 stale 인 상태로 남습니다.",
      en: "`top` is dynamic (driven by a CSS variable), but `IntersectionObserver`'s `rootMargin` is set once at construction. When the filterBar height changed from 44px to 80px (added search row), the sentinel kept gating on the old offset.",
    },
    solution: {
      ko: "`rootMargin` 을 컴포넌트의 실제 sticky `top` 값으로 동기화합니다. `getComputedStyle(filterBar).top` 으로 실측한 값을 `rootMargin: -${stickyTop+1}px 0px 0px 0px` 로 계산해(1px 은 cross 시점 안전 마진), `resize` 이벤트마다 observer 를 disconnect → 재생성합니다. filterBar 의 sibling 인 사이드바 `top` 도 같은 식(`calc(var(--nav-height) + 80px + ...)`) 으로 통일해 두 컴포넌트가 항상 같은 anchor 라인을 공유하도록 합니다.",
      en: "Sync `rootMargin` with the component's actual sticky `top`. Read `getComputedStyle(filterBar).top`, then set `rootMargin: -${stickyTop + 1}px 0px 0px 0px` (the +1px is a cross-frame safety margin). On every `resize`, disconnect and rebuild the observer so nav-height changes are picked up. The sibling sidebar's `top` was updated to the same arithmetic (`calc(var(--nav-height) + 80px + ...)`) so both elements share one anchor line.",
    },
    keyInsight: {
      ko: "sticky element 의 anchor 시점을 알아내는 IntersectionObserver 는 **rootMargin 이 실제 sticky top 과 정확히 일치해야** 합니다. CSS variable / 미디어 쿼리로 sticky top 이 동적으로 변하는 환경에서는 observer 도 같이 재생성하는 게 유일한 정답이고, 정적 값으로 두면 한 viewport 에서는 맞는데 resize 직후 어긋나는 미묘한 버그가 됩니다.",
      en: "For a sticky element, the `IntersectionObserver` that detects \"now stuck\" must use a `rootMargin` that **matches the actual sticky top to the pixel**. When that top is dynamic (CSS variable / media query), the observer must rebuild alongside it — otherwise you get a viewport that looks correct but a 1px drift after `resize`.",
    },
    tags: ["IntersectionObserver", "sticky", "rootMargin", "Posts", "filterBar"],
  },
  {
    section: { ko: "Frontend / Animation", en: "Frontend / Animation" },
    problem: {
      ko: "Series Deck — hover 펼침이 \"사라졌다 나타나는\" 느낌",
      en: "Series Deck — hover unfold \"disappears then reappears\"",
    },
    definition: {
      ko: "`/posts` 의 Series row 카드를 hover 하면 deck 형태로 펼쳐지면서 소속 글 4개가 layer 로 등장해야 하는데, 초기 구현은 (1) 펼쳐지는 순간 deck 이 한 번 사라졌다 나타나는 듯한 깜빡임, (2) hover 직후 너무 빨리 펼쳐져 의도된 deck 멈춤이 안 보임, (3) 펼친 상태에서 layer 가 한 장씩 순차 등장하지 않고 동시에 등장하는 문제가 다발했습니다.",
      en: "Hovering a Series row card on `/posts` should fan it out into a deck of preview layers. The initial implementation suffered from (1) the deck appearing to \"vanish then reappear\" when unfolding, (2) cards spreading immediately on enter — the deliberate hold beat was invisible, (3) all four layers reaching their final position simultaneously instead of staggering.",
    },
    cause: {
      ko: "① layer 등장에 CSS `transition-delay` 로 stagger 를 줬는데, **hover-out 시 모든 delay 가 동시에 cancel** 되어 layer 들이 한꺼번에 사라짐 → \"사라졌다 나타나는\" 듯한 시각 효과. ② transform 의 ease 가 overshoot 계열 `cubic-bezier(0.34, 1.45, ...)` 이라 펼치기 시작 직전부터 미리 약간 벌어진 상태로 보임. ③ CSS `transition-delay: 0s` 라 마우스 진입 즉시 펼쳐짐 → \"deck 이 멈춰있다가 펼쳐지는\" 의도된 시퀀스 부재.",
      en: "① Layer entrance used CSS `transition-delay` for stagger, but **on hover-out every delay cancels at the same moment**, collapsing all layers in unison — the eye reads this as \"vanishing\" rather than \"folding back\". ② The transform easing was `cubic-bezier(0.34, 1.45, ...)` (overshoot), so the cards looked partially spread *before* animation start. ③ With `transition-delay: 0s`, hover entry started the spread immediately — no perceptible hold.",
    },
    solution: {
      ko: "stagger / delay / easing 셋을 모두 JS state 기반으로 재설계. ① 펼침 트리거를 `setTimeout(() => setOpen(true), 800)` 로 800ms 의도된 hold 후 `data-deck-open` flip — CSS `transition-delay` 가 아닌 state 변경 시점이 분명하므로 hover-out 시 timer 만 clear 하면 깔끔히 취소. ② `--deck-i` 를 layer index 로 부여하고 `transition-delay: calc(1s + (var(--deck-i, 1) - 1) * 0.4s)` 로 각 layer 가 직전 layer 펼침이 끝난 뒤 시작되도록 명시(총 4 layer × 0.4s = 1.6s). ③ easing 을 standard `cubic-bezier(0.4, 0, 0.2, 1)` 로 교체해 미리 펼친 듯한 overshoot 제거. ④ layer label / title 도 같은 stagger 로 fade-in 시켜 \"한 장씩 들춰지는\" 느낌 강화.",
      en: "Move stagger / delay / easing all into JS state. ① Trigger via `setTimeout(() => setOpen(true), 800)` with `clearTimeout` on leave — distinct, cancellable, no CSS-delay weirdness. ② Per-layer stagger via CSS variable: assign `--deck-i` per layer and use `transition-delay: calc(1s + (var(--deck-i, 1) - 1) * 0.4s)` (4 layers × 0.4s = 1.6s of clear progression). ③ Standard ease `cubic-bezier(0.4, 0, 0.2, 1)` removes the overshoot tell that made the deck look pre-spread. ④ Layer label/title fade in on the same stagger so each layer feels \"lifted\" one at a time.",
    },
    keyInsight: {
      ko: "① **CSS `transition-delay` 는 enter 만 stagger 하고 leave 도 같이 stagger 됨** — leave 도 staggered 면 OK 지만, \"동시 사라짐 + 순차 등장\" 같은 비대칭 시퀀스는 CSS 만으론 어렵습니다. JS state + 명시적 timer 로 enter/leave 타이밍을 분리해야 의도대로 동작합니다. ② Hover 펼침처럼 \"잠깐 hold 후 등장\" 시퀀스는 `transition-delay` 보다 `setTimeout + state flip` 이 의미가 명확하고 cancel 도 깔끔합니다. ③ Overshoot easing 은 마이크로 모션에서 \"이미 시작된 것처럼\" 보이게 만드므로, **stop → animate 가 분명해야 하는 시퀀스에는 standard ease 가 더 적합**합니다.",
      en: "① **CSS `transition-delay` staggers both enter AND leave.** Symmetric stagger is fine, but asymmetric \"all leave at once + sequential enter\" is hard to achieve in pure CSS — pair JS state with explicit timers when enter/leave timing must differ. ② \"Hold then unfold\" microinteractions read better when triggered by `setTimeout + state flip` than `transition-delay`, since cancellation is clean and the intent is explicit. ③ Overshoot easing makes microinteractions look \"already started\" — when the **stop → animate** moment must read clearly, standard ease is more appropriate.",
    },
    tags: ["CSS transitions", "stagger", "JS state", "hover", "easing", "Series"],
  },
  {
    section: { ko: "Frontend / Interaction", en: "Frontend / Interaction" },
    problem: {
      ko: "Series Deck spread — `setPointerCapture` 가 자식 click 차단 + hit-area 공백으로 flicker",
      en: "Series Deck spread — `setPointerCapture` blocks child clicks + hit-area gaps cause flicker",
    },
    definition: {
      ko: "deck 이 펼쳐진 상태에서 (1) layer 카드를 클릭하면 SeriesCard 의 click 이 전혀 발화되지 않고, (2) layer 와 layer 사이 마진을 마우스가 지나갈 때 hover 가 종료되어 deck 이 닫히고 다시 layer 위에 들어가면 펼침이 재시작되는 flicker 가 발생했습니다.",
      en: "With the deck unfolded, (1) clicking any layer card never dispatched its `onClick` — SeriesCard navigation was dead, and (2) when the cursor crossed the gap between layers (16px), hover ended and the deck collapsed; re-entering a layer triggered the unfold again, producing visible flicker.",
    },
    cause: {
      ko: "① 부모 row 가 가로 스크롤 + 드래그 지원 때문에 `setPointerCapture(e.pointerId)` 를 사용했는데, **pointer 가 캡처된 동안에는 자식의 click 이 부모로 흡수**되어 layer 의 onClick 이 발화되지 않습니다. ② 펼침 시 next 카드를 밀어내려고 `margin-right: 660px` 로 visual 만 확장했는데, `box-sizing: border-box` 와 무관하게 margin 은 element 의 hit-area 를 늘리지 않습니다. layer 와 layer 사이 gap(16px) 위에 마우스가 올라가면 카드 밖으로 인식되어 hover 가 종료됩니다.",
      en: "① The parent row uses `setPointerCapture(e.pointerId)` to support horizontal drag-scroll. While the parent has captured the pointer, **child clicks are absorbed by the parent** and `onClick` on layers never fires. ② To push the next sibling card aside while unfolding, `margin-right: 660px` was added — but margins move visual position only, they don't extend the element's hit area (regardless of `box-sizing`). When the cursor crossed a gap between layers, it landed outside the card's hit area, ending hover.",
    },
    solution: {
      ko: "① `setPointerCapture` 자체를 제거하고 **document-level `pointermove` / `pointerup` 리스너** 로 드래그 추적. click suppression 은 별도 flag(`draggedRef.current = movement > 5px`)로 구현. ② 펼침 상태일 때만 `::after { position: absolute; left: 0; top: 0; bottom: 0; width: calc(100% + 660px) }` pseudo 를 부여해 layer 끝까지 hit-area 확장. pseudo 는 layer 의 자손이 아니므로 click 을 가로채지 않으면서 hover 만 잡아둡니다.",
      en: "① Drop `setPointerCapture` entirely. Track drag with **document-level `pointermove` / `pointerup` listeners** and a click-suppression flag (`draggedRef.current = movement > 5px`). ② While unfolded, attach an `::after` pseudo: `position: absolute; left: 0; top: 0; bottom: 0; width: calc(100% + 660px);` — this extends the hit area to the last layer without intercepting clicks, since pseudo-elements aren't event targets for descendants.",
    },
    keyInsight: {
      ko: "① `setPointerCapture` 는 **드래그 추적 시 편리하지만 자식 click 을 모두 흡수**합니다. 자식 클릭이 필요한 컴포넌트라면 document-level pointer 리스너 + 거리 기반 click suppression 이 더 안전합니다. ② **margin 은 visual 위치만 바꾸고 hit-area 는 안 늘립니다.** Hover 영역을 확장하려면 `padding-right`(box-sizing: content-box) 또는 `::after` pseudo 가 표준 패턴이고, content-box 는 다른 layout 부수효과가 크므로 pseudo 가 더 깔끔합니다. ③ Hover 기반 멀티 스텝 인터랙션(deck 펼침 등)은 마우스가 layer 사이를 지나가는 micro-second 라도 hover 가 끊기면 즉시 flicker — **hover area 는 시각적 boundary 보다 한 단계 더 넓게** 잡아야 안정적입니다.",
      en: "① `setPointerCapture` **is convenient for drag tracking but absorbs all child clicks**. If your component needs child-level clicks, prefer document-level pointer listeners + a distance-based click-suppression flag. ② **Margin moves visual position only — it doesn't extend the hit area.** To enlarge a hover region, use `padding-right` (with `box-sizing: content-box`) or an `::after` pseudo. content-box has too many layout side effects; pseudo is cleaner. ③ Multi-step hover interactions (deck unfold) are exquisitely sensitive — even a microsecond of hover loss between two layers causes flicker, so **define the hover region one step wider than the visual boundary**.",
    },
    tags: ["pointer events", "setPointerCapture", "hit-area", "::after", "Series", "deck"],
  },
  {
    section: { ko: "Frontend / Interaction", en: "Frontend / Interaction" },
    problem: {
      ko: "HTML5 drag 가 pointermove 를 막아 커스텀 커서가 멈추고 type 도 계속 바뀜",
      en: "HTML5 drag suppresses `pointermove` — custom cursor freezes and its type keeps flickering mid-drag",
    },
    definition: {
      ko: "RelationPicker / SortOrderDragList / 시리즈 정렬 등에서 HTML5 드래그를 시작하면 (1) `CursorTrail` 이 마우스 위치를 따라가지 않고 그 자리에 멈추고, (2) drag 중 마우스가 다른 요소 위를 지나갈 때마다 cursor type 이 \"text\" / \"big\" / \"\" 등으로 바뀌어 시각적으로 산만해집니다.",
      en: "Once an HTML5 drag begins (RelationPicker / SortOrderDragList / series reorder), (1) `CursorTrail` stops following the cursor and freezes in place, and (2) as the mouse passes over other elements during the drag, cursor type flickers between \"text\" / \"big\" / \"\" etc., breaking the visual continuity of \"I'm holding something\".",
    },
    cause: {
      ko: "브라우저는 HTML5 drag 진행 중에는 **`pointermove` / `mousemove` 발화를 의도적으로 억제**하고 그 자리를 `dragover` 가 대신 채웁니다. CursorTrail 의 위치 추적은 `pointermove` 만 listen 했으므로 좌표가 업데이트되지 않습니다. 또 `runHitTest` 가 60ms throttle 로 elementFromPoint 결과를 기반으로 cursor type 을 갱신하는데, drag 중에도 그대로 동작하면 \"내가 지금 잡고 있는 것\" 의 cursor 가 hover 한 요소에 따라 매번 바뀌어 일관성이 깨집니다.",
      en: "Browsers **deliberately suppress `pointermove` / `mousemove` while an HTML5 drag is active**, surfacing `dragover` instead. `CursorTrail` only listens for `pointermove`, so its tracked position freezes the moment the drag starts. Separately, `runHitTest` recomputes cursor type on a 60ms throttle from `elementFromPoint` — keep that running during a drag, and the cursor type ping-pongs between every element the user passes over, instead of staying locked to \"grab\".",
    },
    solution: {
      ko: "두 가지 패치를 함께. ① `dragover` 를 동일 핸들러(`handleMouseMove`)로 forward — DragEvent 와 PointerEvent 가 `clientX/Y` 만 공유한다는 점만 활용해 캐스팅 후 호출. ② `dragstart` 시점에 `isHtml5Dragging = true` + `cursorTypeRef.current = \"grab\"` + `setCursorType(\"grab\")` 으로 type 을 lock 하고, `runHitTest` 진입부에서 dragging 중이면 즉시 return. `dragend` / `drop` 에서 flag 해제.",
      en: "Two patches together. ① Forward `dragover` into the same `handleMouseMove` handler — `DragEvent` and `PointerEvent` share `clientX/Y`, so a cast is enough. ② On `dragstart`, set `isHtml5Dragging = true`, lock `cursorTypeRef.current = \"grab\"` and `setCursorType(\"grab\")`. Have `runHitTest` early-return whenever dragging is active. Clear the flag on `dragend` / `drop`.",
    },
    keyInsight: {
      ko: "HTML5 native drag 가 활성이면 pointer 이벤트는 **시스템 차원에서 정지**합니다. `dragover` 로 좌표는 받을 수 있지만, drag 시작 자체와 끝을 따로 추적하지 않으면 hit-test 가 \"이 사람이 뭔가 잡고 있다\" 는 의미를 모릅니다. 커스텀 커서처럼 hover 마다 모드를 바꾸는 컴포넌트는 **drag 시작점에 modes 를 동결, drag 끝점에 해제** 하는 ref 기반 lock 이 필수.",
      en: "While native HTML5 drag is active, pointer events are **suspended at the system level**. `dragover` can keep coordinates flowing, but unless you separately track drag-start and drag-end, your hit-test has no idea the user is mid-drag. For any cursor-state component that flips modes per hover, **freeze the mode on drag-start and release on drag-end via a ref-based lock** — otherwise the cursor's identity collapses into whatever the mouse passes over.",
    },
    tags: ["HTML5 drag", "pointermove", "custom cursor", "dragover", "CursorTrail"],
  },
  {
    section: { ko: "Frontend / Interaction", en: "Frontend / Interaction" },
    problem: {
      ko: "HTML5 D&D 의 quirks 회피 — chip 드래그 정렬을 pointer 기반으로 전환",
      en: "Working around HTML5 D&D quirks — replacing chip-reorder drag with pointer events",
    },
    definition: {
      ko: "RelationPicker 의 chip 순서 변경 / SortOrderDragList 의 페이지네이션 항목 정렬에서 HTML5 D&D 가 다음 세 가지 문제를 동시에 일으켰습니다: (1) `draggable={dragId === id}` 같은 state 토글 패턴이 React batching 때문에 DOM `draggable` 속성 갱신 시점이 늦어 드래그가 시작 안 됨, (2) 같은 코드인데도 \"뒤→앞\" 은 잘 되고 \"앞→뒤\" 만 작동 안 하는 비대칭, (3) 페이지네이션된 리스트에서 source chip 이 페이지 전환으로 unmount 되면 브라우저가 즉시 drag cancel.",
      en: "Two reorder UIs (RelationPicker chips, SortOrderDragList paged items) were hit by three HTML5 D&D quirks simultaneously: (1) toggling `draggable={dragId === id}` from state — the DOM attribute update lagged React batching, so drags wouldn't start; (2) asymmetric behavior — \"back-to-front\" reorder worked but \"front-to-back\" didn't, despite identical code; (3) when the source chip lived on a paginated list and a page change unmounted it mid-drag, the browser immediately cancelled the drag.",
    },
    cause: {
      ko: "HTML5 D&D 는 DOM `draggable` 속성을 **drag 시작 시점에 한 번 읽고**, 이후 변경에 반응하지 않습니다. 또 source 노드가 unmount 되면 drag session 자체가 취소됩니다. \"앞→뒤\" 비대칭은 같은 row 안에서 chip 순서가 바뀌면 React 가 key 기반으로 reconcile 할 때 source DOM 이 다른 위치로 옮겨지면서 drag tracking 이 끊기는 동일 메커니즘입니다. 결국 작은 컴포넌트(chip / list item)에서 D&D 를 쓰면 quirks 의 합산이 너무 큽니다.",
      en: "HTML5 D&D **reads the DOM `draggable` attribute once at drag-start** and never reacts to later changes. It also cancels the session when the source node unmounts. The \"front-to-back\" asymmetry is the same mechanism — when sibling chips reorder, React's key-based reconciliation can move the source DOM into a new slot, breaking the drag tracker. Combine these and small reorder UIs end up with more quirks than features.",
    },
    solution: {
      ko: "두 컴포넌트 모두 **pointer-based drag** 로 교체. ① grip handle 의 `pointerdown` 시점에 document-level `pointermove` / `pointerup` 리스너를 부착하고, 매 frame `elementFromPoint(ev.clientX, ev.clientY)` → `closest(\"[data-chip-id]\")` 로 hover 중인 target id 추적. ② drop 시점은 `pointerup` — 이 시점에서 `selectedIds` 를 splice 해 onChange. ③ 페이지네이션 리스트에서는 list edge(상하 60px) hover 시 `apply()` 로 source 를 인접 페이지의 첫/끝 위치로 **실제로 reorder** — 단순히 setPage 만 하면 source 가 unmount 되어 cancel 되므로, source 가 새 페이지에 자연스럽게 살아남도록 위치 자체를 옮김. ④ `setPointerCapture` 는 **사용 안 함** — 자식 click 을 흡수해 chip 의 onClick(× 제거) 이 죽음.",
      en: "Replace both with **pointer-based drag**. ① On the grip handle's `pointerdown`, attach document-level `pointermove` / `pointerup` listeners. Per move, do `elementFromPoint(ev.clientX, ev.clientY)` → `closest(\"[data-chip-id]\")` to track the hovered target id. ② Drop = `pointerup` — splice `selectedIds` and call `onChange`. ③ For the paginated list, when the source nears a list edge (60px), call `apply()` to **actually reorder** the source into the first/last slot of the adjacent page — a bare `setPage` would unmount the source and cancel the drag, so the position change itself keeps it mounted. ④ Avoid `setPointerCapture` — it would absorb child clicks and kill the chip's × button.",
    },
    keyInsight: {
      ko: "HTML5 native D&D 는 \"이미지 / 파일을 OS 수준에서 다른 앱으로 끌어 가는\" 케이스에 최적화되어 있고, **같은 페이지 안에서 작은 항목 순서를 바꾸는 용도로는 quirks 의 합이 너무 큽니다.** state-driven `draggable` 토글, source unmount 시 cancel, 자식 click 차단 (`setPointerCapture` 시), \"앞→뒤\" 비대칭 등은 전부 D&D 표준의 부산물입니다. **chip / list item 같은 micro-reorder 는 처음부터 pointer events 로 짜는 게** 결과적으로 코드 양도 적고 동작도 일관됩니다.",
      en: "Native HTML5 D&D is optimized for \"drag an image/file to another OS app\" — **for in-page micro-reorder of chips or list items, the sum of its quirks is bigger than its convenience.** State-driven `draggable` toggling, source-unmount cancellation, child-click absorption (with `setPointerCapture`), front-to-back asymmetry — all fall out of the spec. **For micro-reorder UIs, write pointer-event drag from the start** — it ends up shorter and behaves consistently.",
    },
    tags: ["HTML5 drag", "pointer events", "drag-and-drop", "chip", "pagination", "elementFromPoint"],
  },
  {
    section: { ko: "Frontend / Layout", en: "Frontend / Layout" },
    problem: {
      ko: "Navigation 메뉴가 좁은 viewport 에서 우측 actions 와 겹침 + indicator 가 resize 중 메뉴 위치를 못 따라감",
      en: "Navigation menu overlaps the right actions on narrow viewports + indicator drifts behind the menu while resizing",
    },
    definition: {
      ko: "PC 레이아웃에서 navigation 메뉴는 `position: absolute; left: 50%; transform: translateX(-50%)` 로 viewport 정중앙에 고정되어 있었는데, 우측 navActions(언어/사운드/테마/email/Bell/Logout) 가 길어지면 메뉴와 겹치는 너비 구간이 발생. flex 로 바꿔 좌·우 사이 가운데로 옮겼더니 이번엔 active link 를 가리키는 sliding indicator 가 창 너비 변경 중 ~300ms 의 transition lag 으로 메뉴 위치를 따라가지 못해 계속 어긋난 채로 끌려옴.",
      en: "On PC, the nav menu was pinned to viewport center with `position: absolute; left: 50%; transform: translateX(-50%)`. As `navActions` (lang / sound / theme / email / Bell / Logout) grew, there was a viewport range where the menu overlapped the right cluster. Switching to flex (\"center between logo and actions\") fixed the collision but introduced a new bug: the sliding indicator that highlights the active link lagged the menu by ~300ms during continuous resize because of its CSS transition, leaving a visible drift the whole time the user dragged the window edge.",
    },
    cause: {
      ko: "정중앙 고정 방식은 좌측 로고 폭과 우측 actions 폭이 서로 다르거나 `--page-px` 가 작아질 때 절대 위치가 고려되지 못해 자연스럽게 겹침. flex 전환 후 lag 은 `.navIndicator { transition: left var(--duration-moderate) ease, width ... }` 가 항상 활성이라, 매 resize event 가 새 left/width 를 전달해도 indicator 는 이전 값에서 새 값으로 천천히 이동 → 사용자에겐 \"메뉴는 즉시 옮겨가는데 indicator 만 뒤따라옴\".",
      en: "Viewport-center pinning ignores left/right cluster widths — when one side grows or `--page-px` shrinks, collision is inevitable. After moving to flex, the lag came from `.navIndicator { transition: left var(--duration-moderate) ease, width ... }` being always-on. Every resize event pushes new left/width values, but the indicator eases from the previous value toward the new one — to the user, \"the menu jumps to its new position, but the indicator drags ~300ms behind.\"",
    },
    solution: {
      ko: "두 단계. ① 레이아웃: `.navCenter` 를 `position: relative; flex: 1; justify-content: center` 로 전환 — 좌측 로고와 우측 actions 가 각자 자기 폭을 점유하고, 그 사이 남는 공간의 가운데에 메뉴가 자연스럽게 자리잡음. ② indicator 트랜지션: window `resize` + `ResizeObserver(navCenter + nav)` 양쪽 모두 listen. 발화 시 `setIndicatorInstant(true)` + `updateIndicator()` 호출 후 120ms 디바운스로 다시 false. resize 중엔 `style={{ ...indicatorStyle, transition: \"none\" }}` 가 inline 으로 들어가 즉시 snap, resize 끝나면 hover/네비게이션용 transition 복원.",
      en: "Two steps. ① Layout: `.navCenter` → `position: relative; flex: 1; justify-content: center` — logo and actions occupy their natural widths, and the menu sits in the middle of the remaining space, with no overlap risk. ② Indicator transition: listen on both `window resize` and `ResizeObserver(navCenter + nav)`. On every fire, `setIndicatorInstant(true)` + `updateIndicator()`, then a 120ms debounce sets it back to false. While instant, the indicator is rendered with `style={{ ...indicatorStyle, transition: \"none\" }}` so it snaps frame-by-frame to the new position; once resize ends, the normal hover/navigation transition is restored.",
    },
    keyInsight: {
      ko: "① **viewport 절대중앙은 양쪽 영역의 폭을 모름** — 좌·우가 비대칭이거나 동적이면 flex `flex: 1; justify-content: center` 가 \"가운데\" 의 의미를 정확히 표현. ② **CSS transition 은 \"한 번의 사용자 의도\" 에 적합하지, 연속 입력에는 부적합** — resize / scroll 같은 연속 stream 동안엔 transition 을 꺼서 매 frame snap 시키고, stream 종료 후 transition 을 복원해야 \"부드러운 이동\" 의 의미가 유지됨. 인라인 `transition: \"none\"` 으로 짧게 끄는 패턴이 가장 가벼운 해법.",
      en: "① **Absolute viewport-center has no idea what's to the left or right** — for asymmetric/dynamic clusters, `flex: 1; justify-content: center` expresses \"between\" precisely. ② **CSS transitions fit single user intents, not continuous input streams** — during resize / scroll, disable the transition so the element snaps every frame, then re-enable it after the stream ends. An inline `transition: \"none\"` toggled by a debounced state is the lightest pattern that preserves \"smooth\" semantics for hover-driven changes.",
    },
    tags: ["flex", "absolute positioning", "transition", "resize", "Navigation", "indicator"],
  },
  {
    section: { ko: "Frontend / Image", en: "Frontend / Image" },
    problem: {
      ko: "이미지 깨짐 placeholder — `dangerouslySetInnerHTML` 로 렌더된 markdown img 에는 React onError 가 안 붙음",
      en: "Image fallback — React `onError` doesn't bind to `<img>` rendered via `dangerouslySetInnerHTML`",
    },
    definition: {
      ko: "에디터/포스트/Works/Plate 패널 등 **모든 이미지에서** 로드 실패 시 `/images/placeholder.svg` 로 swap 하도록 통일하려 했는데, React 컴포넌트의 `<img onError>` 는 잘 작동하지만, MarkdownRenderer 처럼 marked → HTML → `dangerouslySetInnerHTML` 로 렌더된 img 와 useRichtextEnhance 가 적용되는 richtext 영역에서는 onError 가 전혀 발화되지 않아 깨진 이미지가 그대로 노출됩니다.",
      en: "We wanted a single fallback rule across **every image surface** — editor / posts / works / Plate panels — so that load failures swap to `/images/placeholder.svg`. React's `<img onError>` worked everywhere it was JSX. But in MarkdownRenderer (marked → HTML → `dangerouslySetInnerHTML`) and `useRichtextEnhance`-styled richtext regions, `onError` never fired and broken images stayed visible.",
    },
    cause: {
      ko: "`dangerouslySetInnerHTML` 로 삽입된 DOM 은 React 가 관리하지 않으므로 `onError` 같은 합성 이벤트 prop 이 attached 되지 않습니다. 또 이미 fetch 가 끝난 이미지(`complete && naturalWidth === 0`) 는 listener 를 늦게 부착하면 `error` 가 다시 발화되지 않아 영원히 깨진 상태로 남고, MarkdownRenderer 가 dynamic 하게 새 img 를 추가하는 경우(에디터 토글 / lazy 로드) 는 초기 querySelectorAll 만으로는 못 잡습니다.",
      en: "DOM injected via `dangerouslySetInnerHTML` is outside React's reconciler — synthetic event props like `onError` never bind. Even native `addEventListener(\"error\")` has a sub-trap: an image whose fetch already completed (`complete && naturalWidth === 0`) won't re-fire `error` when a listener is attached late, leaving it stuck. And when richtext content mutates (editor mode toggle, lazy load), a one-shot `querySelectorAll` misses the newly added images.",
    },
    solution: {
      ko: "`useRichtextEnhance` 훅과 MarkdownRenderer 양쪽에 `attachImageFallback(root)` 패턴을 도입. ① 컨테이너 내 모든 `<img>` 에 대해 `data-fallback-bound` 로 중복 부착 방지하면서 `error` listener 부착 + **이미 실패 상태(`complete && naturalWidth === 0`) 면 즉시 swap**. ② `MutationObserver(root, { childList: true, subtree: true })` 로 이후 추가되는 img 도 동일 처리 — 로드 후 swap 시 `srcset` 도 함께 제거해 브라우저가 깨진 srcset 으로 다시 시도하지 않도록 보정. ③ React 컴포넌트(PostEditor cover / WorkEditor main·gallery / RelationPicker chip·option / Plate ImagePanel·ImageElement) 는 `onError` + state swap 으로 동일 효과.",
      en: "Apply the `attachImageFallback(root)` pattern in both `useRichtextEnhance` and MarkdownRenderer. ① Walk every `<img>` in the container, gate with `data-fallback-bound` to prevent double binding, attach an `error` listener, **and immediately swap if the image is already failed (`complete && naturalWidth === 0`)**. ② Run a `MutationObserver(root, { childList: true, subtree: true })` so images added later get the same treatment — when swapping, also `removeAttribute(\"srcset\")` so the browser doesn't keep retrying broken candidates. ③ React-rendered surfaces (PostEditor cover, WorkEditor main/gallery, RelationPicker chip/option, Plate ImagePanel/ImageElement) achieve the same result with `onError` + state swap to a `displayUrl`.",
    },
    keyInsight: {
      ko: "① **`dangerouslySetInnerHTML` 로 들어온 DOM 은 React 합성 이벤트의 사각지대** — 이벤트 위임이 없으니 native `addEventListener` 가 유일한 선택. ② 이미 로드(or 실패) 가 끝난 이미지는 `error` 가 retroactive 하게 발화되지 않으므로, listener 부착 직후 **`complete && naturalWidth === 0` 동기 체크가 필수**. ③ `srcset` 을 두면 src 만 바꿔도 브라우저가 srcset 후보를 우선 시도해 다시 깨질 수 있으므로 swap 시 함께 제거. ④ richtext 처럼 콘텐츠가 동적인 영역은 querySelectorAll 단발이 아니라 **MutationObserver 로 incremental** 처리해야 새로 들어온 img 도 안전.",
      en: "① **DOM from `dangerouslySetInnerHTML` is React's synthetic-event blind spot** — without delegation, `addEventListener` is the only path. ② Images that already finished loading (or failing) won't re-fire `error` retroactively — pair the listener attach with a synchronous `complete && naturalWidth === 0` check. ③ Leaving `srcset` after a `src` swap lets the browser keep retrying the broken candidates — `removeAttribute(\"srcset\")` together with the swap. ④ For dynamic regions like richtext, a one-shot `querySelectorAll` won't catch images added later — pair it with a `MutationObserver` for incremental coverage.",
    },
    tags: ["dangerouslySetInnerHTML", "MutationObserver", "image fallback", "onError", "richtext", "MarkdownRenderer"],
  },
];

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
      ko: "두 곳에서 수동 변환을 추가했습니다: (1) `MarkdownRenderer`의 heading renderer에서 `[^N]` 패턴을 각주 링크 HTML로 직접 변환, (2) `postProcessMarkedHtml`에서 `<h1>`~`<h6>` 태그 안에 남은 `[^N]`을 Plate 호환 각주 HTML로 변환.",
      en: "Added manual conversion in two places: (1) In `MarkdownRenderer`'s heading renderer, directly converting `[^N]` patterns to footnote link HTML, (2) In `postProcessMarkedHtml`, converting remaining `[^N]` inside `<h1>`-`<h6>` tags to Plate-compatible footnote HTML.",
    },
    keyInsight: {
      ko: "마크다운 플러그인의 **실행 순서는 커스텀 renderer에 의해 우회될 수 있습니다**. renderer를 오버라이드할 때는 해당 renderer가 다른 플러그인의 인라인 파싱을 방해하지 않는지 확인해야 합니다.",
      en: "Markdown plugin **execution order can be bypassed by custom renderers**. When overriding renderers, verify they don't interfere with other plugins' inline parsing.",
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
];

# DB 설계 결정

### 통합 좋아요 테이블: `likes`

모든 좋아요(포스트, 작업물, 포스트 댓글, 작업물 댓글)를 단일 `likes` 테이블에서 `target_type`으로 구분합니다.

**검토한 대안:**

| 방식 | 장점 | 단점 |
|------|------|------|
| **단일 테이블** (현재 구조) | Single Source of Truth, 하나의 UNIQUE 제약으로 전체 중복 방지, 새 엔티티 추가 시 CHECK 값 하나만 추가 | `target_type`이 4개 |
| **완전 분리** (post_likes, work_likes, ...) | 쿼리 단순 | 테이블 과다, 스키마 중복 |
| **2테이블** (likes + comment_likes) | 콘텐츠/댓글 관심사 분리 | 동기화 로직 분산, 테이블 수 증가 |

**선택 근거:** `UNIQUE(target_type, target_id, ip)` 하나로 모든 엔티티의 중복을 DB 레벨에서 차단합니다. 댓글 좋아요는 실시간 `COUNT(*)` 쿼리로 조회하고, Posts만 목록 성능을 위해 `posts.like_count` 캐시 컬럼에 동기화합니다. 인덱스가 적용된 상태에서 수천 건까지 성능 차이가 없으므로, 정합성과 단순성을 우선합니다.

### 비정규화 카운트 캐싱: `posts.like_count`

`likes` 테이블이 좋아요의 **source of truth**이고, `posts.like_count`는 목록 조회 성능을 위한 **캐시 컬럼**입니다.

| 엔티티 | 카운트 방식 | 근거 |
|--------|------------|------|
| **Posts** | `posts.like_count` 캐시 컬럼 동기화 | 목록 조회 시 JOIN 없이 즉시 표시 |
| **Works / 댓글** | 실시간 `COUNT(*)` 쿼리 | 목록에서 카운트 불필요, 상세 페이지에서만 조회 |

**선택 근거:** 포트폴리오 사이트는 읽기 >> 쓰기 비율입니다. Posts만 목록에서 좋아요 수를 표시하므로 캐시 컬럼이 필요하고, 나머지는 실시간 조회로 충분합니다.

### 에디터 리비전 히스토리: `revisions`

Posts/Works 에디터의 자동저장 시 폼 전체를 JSONB snapshot으로 영구 저장하는 다형적 테이블입니다.

**검토한 대안:**

| 방식 | 장점 | 단점 |
|------|------|------|
| **별도 DB 테이블** (현재 구조) | 기기·탭·세션 간 영속, 엔티티별 자동 정리, diff 비교 가능 | 자동저장마다 DB 쓰기 발생 |
| **sessionStorage** (이전 구조) | 즉시 접근, DB 부하 없음 | 탭 닫으면 소멸, 기기 간 공유 불가 |

**선택 근거:** 포트폴리오 관리자(1인)가 사용하므로 DB 쓰기 비용은 무시 가능합니다. 기기·탭·세션 간 리비전 공유와 diff 기반 상세 비교가 더 중요합니다. `entity_type` CHECK 컬럼으로 posts/works를 단일 테이블에서 구분하고, 목록 조회 시 snapshot을 제외하여 경량 로딩합니다. JSON.stringify 해시 비교로 동일 snapshot 중복 저장을 방지하며, 상세 뷰에서 카테고리·태그·시리즈 등 메타 항목도 diff로 표시합니다.

**자동저장 주기 결정:** 초기에는 5초 debounce로 구현했으나, Google Docs(OT/diff 방식)·Notion(즉시 저장이지만 서버엔 patch)·WordPress(60초)와 비교했을 때 **전체 스냅샷 방식에서 5초는 너무 잦아** 리비전이 무의미하게 누적되는 문제가 있었습니다. diff 방식은 단일 사용자 환경과 스냅샷 50개 제한(~2.5MB) 규모에서 복잡도 대비 이득이 없어 채택하지 않았습니다. **30초 debounce + 페이지 이탈 시 강제 저장**으로 변경했습니다. 이탈 저장은 두 경로로 처리합니다: 브라우저 닫기·새로고침은 `navigator.sendBeacon`(비동기 보장), Next.js SPA 라우팅은 컴포넌트 언마운트 cleanup에서 `fetch({ keepalive: true })`를 사용합니다.

### 익명 댓글 이중 인증

로그인 없는 댓글 시스템에서 수정/삭제 권한을 **2개 경로**로 검증합니다.

| 인증 경로 | 저장 위치 | 지속성 | 용도 |
|-----------|----------|--------|------|
| `commenter_hash` | 브라우저 localStorage UUID → SHA-256 | 같은 브라우저에서 영구 | 자동 인증 (비밀번호 입력 불필요) |
| `password_hash` | bcrypt (salt round 10) | 사용자가 기억하는 한 영구 | 다른 기기/브라우저에서 인증 |

**왜 둘 다 필요한가:** `commenter_hash`만 있으면 브라우저 변경 시 수정 불가. `password`만 있으면 매번 입력 필요. 병행하면 같은 브라우저에서는 자동 인증, 다른 환경에서는 비밀번호 fallback으로 UX와 보안을 모두 확보합니다.

### 댓글 시스템 기능

| 기능 | 설명 |
|------|------|
| **닉네임 셔플** | 랜덤 이모지+이름 조합, 셔플 버튼으로 변경 가능 |
| **답글 이메일 알림** | 댓글 작성 시 이메일(선택) 입력하면 답글 알림 발송 (`notify_email` 컬럼) |
| **관리자 댓글** | 로그인 상태에서 비밀번호 없이 Admin 뱃지로 댓글 작성, 서버 측 Supabase Auth 재검증 |

### 투표 블록 집계: `poll_votes`

본문 에디터의 투표(poll) 블록 응답을 집계하는 테이블입니다. 투표의 **구조(질문·옵션)는 별도 테이블이 없고**, 에디터 블록의 저장 HTML/JSON 안에 들어 있습니다.

| 컬럼 | 설명 |
|------|------|
| `id` | uuid PK |
| `poll_id` | 에디터가 블록 생성 시 부여하는 고정 text id (저장 HTML `data-poll-id`) |
| `option_id` | 투표 옵션 고정 text id (`data-option-id`) |
| `ip` | 투표자 IP (DEFAULT `''`), 중복 방지용 |
| `created_at` | timestamptz |

**검토한 대안:**

| 방식 | 장점 | 단점 |
|------|------|------|
| **단일 집계 테이블** (현재 구조) | 투표 구조를 에디터 콘텐츠와 함께 저장, 스키마 단순 | poll_id/option_id 가 FK 가 아닌 text |
| **`polls` + `poll_options` 정규화** | 참조 무결성 | 본문 블록을 저장할 때마다 별도 테이블 동기화 필요, 테이블 증가 |

**선택 근거:** 투표 블록의 질문·옵션은 본문 콘텐츠의 일부이므로 게시물 HTML 안에 함께 저장하고, `poll_votes` 는 **순수 집계**만 담당합니다. 그래서 `poll_id` / `option_id` 는 FK 가 아닌 에디터가 부여한 text id입니다. `UNIQUE(poll_id, option_id, ip)` 로 같은 IP 의 같은 옵션 중복 투표를 DB 레벨에서 차단하고, `poll_id` 인덱스로 집계 조회를 최적화합니다. 단일 선택 투표는 API 가 `(poll_id, ip)` 행을 지우고 다시 넣어 교체하고, 복수 선택은 옵션별 토글(insert/delete)로 처리합니다. RLS 는 public SELECT + service_role ALL (집계/투표는 admin client 로 처리).

### 시리즈↔프로젝트 연결: `series_work_relations`

프로젝트(work)에 관련 시리즈를 연결하는 다대다 테이블로, 기존 `post_work_relations` 와 동일한 패턴입니다.

| 컬럼 | 설명 |
|------|------|
| `series_id` | uuid FK → `series(id)` ON DELETE CASCADE |
| `work_id` | uuid FK → `works(id)` ON DELETE CASCADE |
| `created_at` | timestamptz |

PRIMARY KEY 는 `(series_id, work_id)` 복합키이고, `series_id` / `work_id` 각각에 인덱스가 있습니다. RLS 는 public SELECT + service_role ALL.

**선택 근거:** posts↔works 양방향 연결(`post_work_relations`)이 이미 검증된 다대다 패턴이므로 시리즈↔프로젝트 연결도 동일 구조로 통일했습니다. 양쪽 FK 에 ON DELETE CASCADE 를 걸어 시리즈나 작품 삭제 시 연결 행이 자동 정리되고, 복합 PK 로 같은 쌍의 중복 연결을 차단합니다.



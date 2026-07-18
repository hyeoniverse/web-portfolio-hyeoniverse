# User Flow

### 방문자 플로우

```
Home → Works 갤러리(가로 스크롤) → Work 상세(좋아요)
     → Posts 목록(검색/태그 필터) → Post 상세(좋아요/댓글)
     → Profile → About(기술 문서)
```

- **Works**: 가로 스크롤 갤러리에서 프로젝트를 탐색하고, 상세 페이지에서 IP 기반 좋아요를 남길 수 있습니다. 상세 페이지 하단에는 관련 프로젝트 가로 캐러셀(hover 미리보기) + 관련 시리즈/게시물 칩이 노출됩니다. 모바일 등 터치 기기에서는 Footer 의 ViewModeToggle 로 PC 버전 보기를 전환할 수 있습니다
- **Posts**: 상단 서브네비(All / Series / Tags / History)로 하위 인덱스에 진입하고, 태그/검색/카테고리(2단계 트리, 다중 선택)로 글을 필터링할 수 있습니다. 카테고리를 선택하면 해당 카테고리의 시리즈가 책 모양 카드로 표시되며, 시리즈를 클릭하면 소속 포스트만 필터링됩니다. 상세 페이지에서 좋아요와 게스트 댓글(이중 인증: 브라우저 UUID + 비밀번호)을 남길 수 있으며, 댓글은 마크다운 작성/미리보기 + 이모지 반응(고정 8종)을 지원합니다. 관리자가 설정에서 댓글 provider 를 giscus 로 바꾸면 같은 자리에 GitHub Discussions 위젯이 렌더됩니다. 시리즈 소속 글에서는 이전/다음 글 네비게이션이 표시됩니다
- **About**: 가로 스크롤로 14개 패널(프로젝트 개요, 유저 플로우, 아키텍처, 기능, 디자인 시스템, 개발 프로세스, 기술 스택, 백엔드, ERD, 코드 하이라이트, 트러블슈팅, 보안)을 순회합니다. UserFlow 패널은 9개 플로우(Visitor, Posts, Works, Profile, Contact, Comment, Admin/Settings, Admin/Settings/Appearance, Admin/Posts·Works)를 탭+SVG 다이어그램으로 시각화, ERD 패널은 23개 테이블 풀 스키마를 줌/팬 인터랙티브 다이어그램으로 표시(테이블 클릭 시 자동 줌인 + 관계선 하이라이트 + 설계 노트), Security 패널은 8개 보안 레이어(SQL Injection, XSS, 입력 검증, 이중 인증, RLS, 경로 보호, 중복 방지, 시크릿 관리)를 시각화

### 관리자 플로우

```
/admin 직접 접속 → GitHub OAuth 로그인(`/auth/callback` 인가 게이트 — 미초대 계정 차단) 또는 비밀번호 로그인(소유자 폴백) → Settings 리다이렉트
→ 포스트 작성(Markdown/Rich Text 전환, 에디터에서 투표·탭 블록 + CoverBanner 커버 배너 추가 가능) → 커버 이미지 선택(프리셋/Unsplash/AI) → 시리즈 선택(선택사항) → 발행
→ 작업물 관리(/admin/works) — 생성, 수정, 삭제, 발행/비공개 전환, 정렬 순서 변경
→ 사이트 설정(/admin/settings) — General(브랜드/로고 커스터마이징, SEO, 푸터, BGM), Content(Home/Profile/About/Posts/Works 서브탭), Appearance(테마·타이포그래피·날짜 선택 스타일), Services(API 키 관리·비밀번호 확인 후 원본 노출), Account(이메일 변경 pending 관리·비밀번호 정책·보안 알림 메일 + 멤버 관리)
→ 멤버 관리(Account 탭, 소유자 전용) — 이메일로 멤버 초대(author_invites + Resend) → 초대받은 사람이 같은 이메일 GitHub 로 로그인하면 역할 부여 → 소유자/편집자/저자 역할·권한 변경·삭제. 비소유자는 Account 탭만 접근(다른 설정 탭은 클라이언트+서버 양쪽 소유자 전용)
→ 설정 충돌 감지 — 코드 기본값 변경 시 DB 저장값과 비교하여 per-hunk diff 모달로 시각화, 저장 시 체크된 항목 자동 반영 (deepEqual 비교로 JSON 키 순서 무관)
```

- 로그인 버튼 없이 URL 직접 접속 방식 — 멤버는 GitHub OAuth, 소유자는 `OWNER_EMAIL` 로 부트스트랩
- Layout 레벨 Supabase Auth 세션 검증 — 미인증 시 `/admin/denied` 접근 거부 페이지로 리다이렉트
- 역할 기반 접근 — 서버 헬퍼가 매 요청 `app_metadata` 재확인, 비소유자는 사이트 설정 쓰기 불가
- 크로스탭 로그아웃 — `AdminAuthSync` 가 `SIGNED_OUT` 브로드캐스트를 받으면 열린 모든 탭이 로그인 화면으로



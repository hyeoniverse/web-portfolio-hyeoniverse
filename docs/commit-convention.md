# Git 커밋 컨벤션

> [Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/) 기반 커밋 메시지 규칙. 기계가 검사하는 규칙은 [`commitlint.config.js`](../commitlint.config.js) 가 원본이다.

---

## 커밋 메시지 형식

```
<타입>(<범위>): <제목>

<본문>

<꼬리말>
```

위 형식에서 타입과 제목은 필수이고, 범위 · 본문 · 꼬리말은 선택이다.

- **타입**: 커밋의 종류
- **범위**: 변경된 영역
- **제목**: 무엇을 바꿨는지 짧게
- **본문**: 왜 바꿨는지와 자세한 내용
- **꼬리말**: 관련 이슈 번호, Breaking Change

---

## 타입 목록

`type-enum` 이 허용하는 타입은 아래 열한 개다. 그 밖의 타입(예: `feature`)은 커밋이 거부된다.

| 타입 | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | `feat: 무한 스크롤 기능 추가` |
| `fix` | 버그 수정 | `fix: 테마 토글 아이콘 미변경 버그 수정` |
| `design` | 기능 변경 없이 레이아웃 · 스타일 · 간격만 조정 | `design(webflow): dotNav 간격 조정 + indicator 높이 통일` |
| `docs` | 문서 수정 | `docs: README 설치 방법 추가` |
| `style` | 코드 포맷팅 (세미콜론, 들여쓰기 등) | `style: prettier 적용` |
| `refactor` | 리팩토링 (기능 변경 없음) | `refactor: 커스텀 훅 분리` |
| `perf` | 성능 개선 | `perf: 이미지 지연 로딩 적용` |
| `test` | 테스트 추가/수정 | `test: 유틸 함수 테스트 추가` |
| `chore` | 빌드, 패키지 설정 등 | `chore: husky 설정 추가` |
| `ci` | CI/CD 설정 변경 | `ci: GitHub Actions 워크플로우 추가` |
| `revert` | 이전 커밋 되돌리기 | `revert: feat: 무한 스크롤 기능 추가` |

`design` 과 `style` 은 다르다. `design` 은 화면에 보이는 모양을 바꾸고, `style` 은 코드 서식만 바꾼다.

---

## 범위

범위는 소문자로 쓴다(`scope-case`). 정해진 목록은 없고, 바뀐 영역을 가리키는 이름을 쓴다. 아래는 이 저장소 커밋 기록에서 자주 쓰인 범위다.

| 범위 | 영역 |
|------|------|
| `admin` | 관리자 화면 전반 |
| `editor` | 글 · 작업물 편집기 (PlateEditor) |
| `about` | About 페이지 |
| `posts` | 글 목록 · 상세 |
| `works` | 작업물 목록 · 상세 |
| `settings` | 관리자 설정 |
| `ui` | 공용 UI 컴포넌트 |
| `webflow` | 작업물 가로 스크롤 갤러리 |
| `nav` | 내비게이션 |
| `design-system` | 디자인 시스템 · `/design-system` 페이지 |
| `deps` | 의존성 |
| `home` | 홈 |
| `i18n` | 번역 · 다국어 |
| `profile` | 프로필 페이지 |
| `comments` | 댓글 |
| `tokens` | 디자인 토큰 |

`admin/settings` · `admin/dashboard` 처럼 `/` 로 하위 영역을 붙이기도 한다.

---

## 길이 제한

| 규칙 | 값 | 어기면 |
|------|----|--------|
| `header-max-length` | 첫 줄 전체 100자 | 거부 |
| `subject-max-length` | 제목 72자 | 거부 |
| `subject-full-stop` | 제목 끝에 마침표 금지 | 거부 |
| `subject-empty` · `type-empty` | 제목 · 타입 비우기 금지 | 거부 |
| `type-case` | 타입은 소문자 | 거부 |
| `body-max-line-length` | 본문 한 줄 100자 | 경고 |

`subject-case` 는 꺼져 있다. 한글 제목과 고유명사를 그대로 쓰기 위해서다.

---

## 커밋 메시지 작성 규칙

### 제목 (Subject)

1. 마침표(.) 사용하지 않음
2. 명령문으로 작성 (예: "추가", "수정", "삭제")

### 본문 (Body)

1. 제목과 본문 사이에 빈 줄 추가
2. "무엇을", "왜" 변경했는지 설명

### 꼬리말 (Footer)

1. 관련 이슈 번호 연결: `Closes #123`, `Fixes #456`, `Refs #789`
2. Breaking Changes 명시: `BREAKING CHANGE: API 응답 형식 변경`

---

## 커밋 메시지 예시

### 기본 형식

```
feat: 무한 스크롤 기능 추가
```

### 범위 포함

```
feat(home): Hero 섹션 패럴랙스 효과 추가
```

### 본문 포함

```
fix(animation): 스크롤 애니메이션 깜빡임 수정

GSAP ScrollTrigger의 anticipatePin 옵션을 활성화하여
스크롤 시 발생하던 레이아웃 깜빡임 현상을 해결
```

### 꼬리말 포함

```
feat(contact): 이메일 전송 기능 추가

Resend API를 사용한 이메일 전송 기능 구현
reCAPTCHA v3 검증 추가

Closes #42
```

### Breaking Change

```
refactor(api)!: 이메일 API 응답 형식 변경

BREAKING CHANGE: API 응답이 { success: boolean } 에서
{ status: 'success' | 'error', message: string } 형식으로 변경됨
```

---

## 잘못된 예시

```
❌ Fixed bug                    # 타입 누락
❌ feat: Fixed the bug.         # 마침표 사용, 과거형 사용
❌ FEAT: 버그 수정              # 타입 대문자
❌ feature: 버그 수정           # 허용되지 않은 타입
❌ feat : 버그 수정             # 콜론 앞 공백
❌ feat:버그 수정               # 콜론 뒤 공백 누락
```

## 올바른 예시

```
✅ fix: 버그 수정
✅ feat(home): Hero 섹션 추가
✅ design(admin): 외관 탭을 카드 없이 가볍게 정리한다
✅ docs: 커밋 컨벤션 문서 작성
```

---

## 자동 검사

Husky 의 `commit-msg` 훅(`.husky/commit-msg`)이 `commitlint --edit` 로 메시지를 검사한다. 위 표에서 "거부" 인 규칙을 어기면 커밋이 만들어지지 않는다.

`pre-commit` 훅은 메시지가 아니라 코드를 검사한다. 커밋 작성자 · 커미터가 도구 계정(`anthropic.com`)이면 막고, 그다음 `lint-staged` 를 돌린다. 무엇을 돌리는지는 [testing.md](./testing.md#커밋-전-검사)에 있다.

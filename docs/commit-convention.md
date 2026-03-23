# Git 커밋 컨벤션

> [Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/) 기반 커밋 메시지 규칙

---

## 커밋 메시지 형식

```
<타입>(<범위>): <제목>

<본문>

<꼬리말>
```

### 필수 요소

- **타입**: 커밋의 종류 (필수)
- **제목**: 변경 사항에 대한 간결한 설명 (필수)

### 선택 요소

- **범위**: 변경된 컴포넌트/모듈 (선택)
- **본문**: 변경 이유 및 상세 설명 (선택)
- **꼬리말**: 관련 이슈 번호, Breaking Changes 등 (선택)

---

## 타입 목록

| 타입 | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | `feat: 무한 스크롤 기능 추가` |
| `fix` | 버그 수정 | `fix: 테마 토글 아이콘 미변경 버그 수정` |
| `docs` | 문서 수정 | `docs: README 설치 방법 추가` |
| `style` | 코드 포맷팅 (세미콜론, 들여쓰기 등) | `style: prettier 적용` |
| `refactor` | 리팩토링 (기능 변경 없음) | `refactor: 커스텀 훅 분리` |
| `perf` | 성능 개선 | `perf: 이미지 지연 로딩 적용` |
| `test` | 테스트 추가/수정 | `test: 유틸 함수 테스트 추가` |
| `chore` | 빌드, 패키지 매니저 설정 등 | `chore: husky 설정 추가` |
| `ci` | CI/CD 설정 변경 | `ci: GitHub Actions 워크플로우 추가` |
| `revert` | 이전 커밋 되돌리기 | `revert: feat: 무한 스크롤 기능 추가` |

---

## 범위 예시

범위는 변경된 영역을 나타내며, 소문자로 작성합니다.

| 범위 | 설명 |
|------|------|
| `components` | 공통 컴포넌트 |
| `hooks` | 커스텀 훅 |
| `styles` | 스타일/CSS |
| `utils` | 유틸리티 함수 |
| `api` | API 라우트 |
| `home` | 홈 페이지 |
| `works` | Works 페이지 |
| `about` | About 페이지 |
| `contact` | Contact 기능 |
| `animation` | 애니메이션 관련 |
| `deps` | 의존성 |

---

## 커밋 메시지 작성 규칙

### 제목 (Subject)

1. 50자 이내로 작성
2. 마침표(.) 사용하지 않음
3. 명령문으로 작성 (예: "추가", "수정", "삭제")
4. 첫 글자는 소문자 (영문의 경우)

### 본문 (Body)

1. 제목과 본문 사이에 빈 줄 추가
2. "무엇을", "왜" 변경했는지 설명
3. 한 줄에 72자 이내 권장

### 꼬리말 (Footer)

1. 관련 이슈 번호 연결: `Closes #123`, `Fixes #456`
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
❌ feat : 버그 수정             # 콜론 앞 공백
❌ feat:버그 수정               # 콜론 뒤 공백 누락
```

## 올바른 예시

```
✅ fix: 버그 수정
✅ feat(home): Hero 섹션 추가
✅ docs: 커밋 컨벤션 문서 작성
```

---

## 자동 검사

이 프로젝트는 Husky와 commitlint를 사용하여 커밋 메시지를 자동으로 검사합니다.

규칙을 따르지 않는 커밋 메시지는 자동으로 거부됩니다.

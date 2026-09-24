# Trouble Shooting: 아키텍처 · 데이터

[← 전체 목차](../troubleshooting.md)

<details>
<summary><strong>11. React 재조정: 같은 자리의 컴포넌트 타입이 바뀌면 서브트리가 리마운트된다</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/home-dark.png" width="100%" alt="Home — Loading Screen" />
</p>

**문제**

페이지에서 처음으로 언어를 전환하면 로딩 화면이 다시 나타남. 두 번째 전환부터는 정상 동작

**원인**

- `RecaptchaProvider`가 첫 번째 클릭 이벤트에서 `shouldLoad`를 `false` → `true`로 변경
- 렌더 트리가 `<Fragment>{children}</Fragment>` → `<GoogleReCaptchaProvider>{children}</GoogleReCaptchaProvider>`로 변경됨
- React는 같은 위치에서 컴포넌트 타입이 바뀌면 하위 트리 전체를 unmount → remount함
- `useLoadingScreen()`의 `useState(true)` 초기값으로 인해 로딩 화면이 재출현

**해결**

모듈 레벨 플래그로 초기 로딩 완료 여부를 추적하여 remount 시 로딩 화면을 건너뜀

```tsx
// 모듈 레벨: 컴포넌트 remount에도 유지됨
let hasCompletedInitialLoad = false;

export function useLoadingScreen() {
  // remount 시 이미 로딩 완료된 세션이면 false로 시작
  const [isLoading, setIsLoading] = useState(() => !hasCompletedInitialLoad);
  const hasCompletedRef = useRef(hasCompletedInitialLoad);

  const completeLoading = () => {
    hasCompletedRef.current = true;
    hasCompletedInitialLoad = true; // 모듈 플래그 동기화
    setIsLoading(false);
  };
}
```

**인사이트**

서드파티 Provider를 조건부로 렌더링하면(`Fragment` ↔ `Provider`) React가 하위 트리를 remount함. `useState` 초기값에 의존하는 상태는 모듈 레벨 변수로 보완해야 remount에 안전함


</details>

<details>
<summary><strong>12. 비교 기준 초기화: 초기값이 실데이터와 다르면 첫 비교는 늘 '변경됨'</strong></summary>

**문제**

에디터를 열고 아무 수정도 하지 않았는데 30초 후 '자동저장됨' 표시가 나타나고, 다음 방문 시 '자동저장된 버전을 불러올까요?' 프롬프트가 표시됨

**원인**

`useEditorAutoSave` 훅의 `lastAutoSaveJson` ref 초기값이 빈 문자열(`""`)이었음. 30초 debounce 후 현재 폼을 `JSON.stringify`한 결과와 `""`를 비교하면 항상 다르므로, **변경 없이도 리비전이 생성**됨

```
lastAutoSaveJson.current = ""    // 초기값
JSON.stringify(form)     = "{...}"  // 현재 폼
"" !== "{...}"           → 변경으로 판단 → 리비전 저장 ✗
```

**해결**

초기값을 `JSON.stringify(formRef.current)`로 변경하여, 최초 폼 상태와 동일하면 저장을 건너뜀

**인사이트**

비교 기준 ref의 초기값이 실제 데이터와 다른 타입/형태이면, **첫 비교가 항상 '변경됨'으로 판단**됨. 초기값은 반드시 실제 초기 상태를 반영해야 함


</details>

<details>
<summary><strong>13. 자동저장 설계: 언제 저장하지 않을지가 핵심이다</strong></summary>

**문제**

초기 자동저장은 `localStorage`에 직접 저장하는 방식이었으나, 여러 문제가 복합적으로 발생:
1. **탭/기기 간 공유 불가** — localStorage는 같은 브라우저에서만 접근 가능
2. **새로고침 시 불필요한 저장** — 변경 없이도 "자동저장됨" 표시
3. **무시한 리비전과 동일 내용 재질문** — dismiss 후 같은 내용이 반복 알림

**원인**

1. localStorage의 태생적 한계 (브라우저 로컬 저장소)
2. `lastAutoSaveJson` ref 초기값이 `""`(빈 문자열)이라 `JSON.stringify(form)`과 항상 다르게 판단
3. dismissed 리비전의 snapshot을 추적하지 않아, DB에 동일 내용 리비전이 다시 생성되면 재알림

**해결**

**3단계에 걸쳐 개선:**
1. localStorage를 완전 제거하고 **DB `revisions` 테이블을 유일한 저장소**로 변경 — 탭/기기 간 공유 가능
2. `lastAutoSaveJson` 초기값을 `JSON.stringify(formRef.current)`로 설정하여 **최초 상태와 동일하면 저장 건너뜀**
3. dismissed 리비전의 snapshot을 `Set`으로 추적하여, **동일 내용이면 재질문하지 않음**

추가로 페이지 이탈 시 `navigator.sendBeacon`(브라우저 종료)과 `fetch({ keepalive: true })`(SPA 라우팅)를 사용하여 **마지막 상태 유실 가능성을 최소화** (sendBeacon·keepalive 는 최선 노력 방식이라 절대 보장은 아니다)

**인사이트**

자동저장은 단순히 "주기적으로 저장"이 아니라, **"언제 저장하지 않을지"가 핵심**. 비교 기준 초기화, 중복 감지, dismissed 추적까지 고려해야 불필요한 리비전 누적과 UX 혼란을 방지할 수 있음


</details>

<details>
<summary><strong>14. SSR 포함 여부: 첫 화면을 덮는 오버레이는 서버 HTML 에 실려야 한다</strong></summary>

**문제**

페이지 로드 시 콘텐츠가 잠깐 보인 후에 로딩 화면(검은 배경)이 나타남

**원인**

`LoadingScreen`이 `ClientOverlays` 안에서 `dynamic(() => import(...), { ssr: false })`로 불러와져 서버 HTML에 포함되지 않았음. 브라우저가 JS 번들을 로드하고 React가 하이드레이션을 완료한 후에야 `LoadingScreen`이 마운트되어, 그 사이 콘텐츠가 노출됨

**해결**

`LoadingScreen`만 일반 `import`로 변경하여 서버 HTML에 포함되도록 수정. `useLoadingScreen()` 훅의 초기값이 `isLoading: true`이므로 SSR 시점에 `opacity: 1` 검은 배경이 HTML에 포함됨. 나머지 오버레이(Modal, CursorTrail 등)는 서버에서 렌더할 필요가 없어 `ssr: false` 유지

**인사이트**: 첫 화면을 덮어야 하는 오버레이는 서버 HTML 에 실려야 한다. `ssr: false` 는 하이드레이션이 끝난 뒤에야 나타난다.


</details>

<details>
<summary><strong>15. 산출물 디렉터리 공유: dev 와 build 가 같은 .next 를 쓰면 청크가 깨진다</strong></summary>

**문제**: 개발 중 빌드 검증을 하려고 `npm run build` 를 돌리면 열려 있던 dev 사이트가 `ChunkLoadError` 로 깨짐

**원인**: `next dev` 와 `next build` 가 같은 `.next` 디렉터리를 공유 — 빌드가 dev 산출물을 덮어써서 브라우저가 들고 있던 청크 해시가 사라짐

**해결**: dev 서버가 떠 있는 동안엔 빌드를 돌리지 않음 (또는 별도 `distDir` 로 분리)

**인사이트**: 두 프로세스가 같은 산출물 디렉터리를 쓰면 "빌드 검증" 이 곧 "dev 환경 파괴" 가 된다 — 빌드 통과 여부를 확인하려면 dev 를 내리거나 산출물 경로를 분리해야 한다


</details>

<details>
<summary><strong>16. 소프트 삭제와 복구성: 되살리려면 삭제가 파괴적이면 안 된다</strong></summary>

**문제**: 삭제(tombstone)된 댓글을 되살리는 기능을 만들려는데, `is_deleted` 만 되돌려도 내용이 빈 댓글이 복구됐다.

**원인**: 댓글 삭제가 tombstone 시 `content`·`password_hash`·`commenter_hash` 를 전부 빈 값으로 덮어썼다(프라이버시 목적). 복구할 원문 자체가 DB 에 없었다.

**해결**: 삭제 시 내용을 보존하되, 공개 API 에서 가린다.

1. tombstone 은 `is_deleted`/`deleted_by` 만 세팅하고 content 는 보존
2. 공개 GET 은 `is_deleted` 행의 `content`·`commenter_hash` 를 응답에서 빈 값으로 마스킹(UI 는 어차피 placeholder 를 그림), 관리자 GET 은 원문 유지 → 복구 미리보기에 사용
3. 복구 엔드포인트는 `is_deleted=true` 행만 매칭 — 하드 삭제로 행이 사라진 "완전 삭제" 는 자연히 404

**인사이트**: "복구" 는 "삭제 시 무엇을 지웠는가" 에 달렸다 — 되살릴 수 있으려면 삭제가 데이터를 파괴하지 않아야 하고, 그 대신 노출은 API 응답 레이어에서 가려야 프라이버시와 복구성이 양립한다


</details>

<details>
<summary><strong>17. 낙관적 복원의 시각 비교: 신뢰할 수 없는 타임스탬프는 롤백을 부른다</strong></summary>

**문제**: 기존 글에서 블록을 DnD 로 옮기거나 편집하면 자동저장 후 내용이 통째로 옛 버전으로 롤백.

**원인**: 서버(cross-device) 자동복원이 로드 시 "저장본보다 오래된 dismiss 안 된 revision" 을 복원. 기존 글의 과거 저장이 `posts.updated_at` 을 안 올려 stale 판정이 안 됐다.

**해결**: 서버 자동복원 비활성 → localStorage(같은 기기) 복원만 사용, `posts.content` 가 진실. 재활성화는 각 글 1회 저장(옛 revision dismiss + `updated_at` 갱신) 또는 `savedAt>updated_at` 가드 후 가능.

**인사이트**: 낙관적 복원은 "저장본이 최신" 이라는 신뢰 가능한 시각 비교가 있어야 안전하다.


</details>

<details>
<summary><strong>18. 스키마 타입과 sentinel: 아직 없는 엔티티의 참조는 uuid 에 못 담는다</strong></summary>

**문제**: 새 글(아직 저장 안 됨)에서 자동저장 요청이 전부 500.

**원인**: `revisions.entity_id` 가 uuid 인데, 저장 전 새 글은 `posts.id` 가 없어 draft sentinel 문자열(`"draft-new-post"`) 을 `entity_id` 로 보냄 → uuid 캐스팅 실패.

**해결**: `revisions.entity_id` 를 text 로 변경(마이그레이션 `2026_08_05`). `setup.sql` 도 반영.

**인사이트**: 아직 존재하지 않는 엔티티의 임시 참조는 uuid 로 못 담는다 — sentinel 을 허용하려면 text.


</details>

<details>
<summary><strong>19. 서버 쿠키와 클라 내비게이션: 인증 상태가 바뀌면 전체 리로드</strong></summary>

**문제**: 이메일 로그인에 성공해도 admin 페이지 진입에 새로고침이 필요했고, 네비게이션의 로그인 상태 표시(이메일, 알림, 로그아웃)가 나타나지 않았다.

**원인**: 로그인이 서버 라우트에서 일어나 응답의 Set-Cookie 로 세션 쿠키만 심긴다. 브라우저 Supabase 클라이언트는 SIGNED_IN 이벤트를 받지 못한다. 이 상태에서 `router.push` 로 이동하면 서버 layout 의 `getUser()` 가 새 쿠키를 못 보고, 루트에 계속 마운트돼 있던 Navigation 의 훅은 마운트 시 한 번만 쿠키를 확인해서 다시 보지 않는다.

**해결**: 로그인 성공 후 이동을 `window.location.assign` 전체 리로드로 바꿨다. GitHub OAuth 의 서버 redirect 와 같은 방식이다. 전체 리로드가 Navigation 을 쿠키 실은 채 새로 마운트시켜 두 증상이 함께 사라진다.

**인사이트**: 서버가 심은 쿠키는 클라이언트 내비게이션으로 전파되지 않는다. 인증 상태를 바꾼 직후는 전체 내비게이션이 안전하다.


</details>

<details>
<summary><strong>20. 외부 서비스 신뢰성 측정: 콘솔 오류가 아니라 상태 코드 분포로</strong></summary>

**문제**: 첨부한 오피스 문서 미리보기 iframe 이 수시로 비고, Chrome 이 "gview 다운로드 실패" 알림을 띄웠다.

**원인**: `docs.google.com/gview?embedded=true` 는 iframe 요청(Sec-Fetch-Dest: iframe)에 12번 중 5번꼴로 204 빈 응답을 돌려줬다. iframe 이 비고, Chrome 은 그 이동을 파일 다운로드 시도로 받아 실패 알림을 띄운다. 코드 문제가 아니라 서비스 자체의 동작이다.

**해결**: MS 뷰어(`view.officeapps.live.com/op/embed.aspx`)로 바꿨다. 같은 조건에서 8번 모두 200 이었다. 저장된 HTML 에 굳어 있는 예전 gview 주소는 그릴 때 `migrateOfficeViewerUrls` 가 바꾼다. MS 뷰어 콘솔의 `appChrome is not defined` 오류는 화면과 무관하다. 예전에 이 콘솔 오류만 보고 gview 로 옮겼다가 204 를 만났다.

**인사이트**: 외부 뷰어의 신뢰성은 콘솔 오류가 아니라 상태 코드 분포로 판단한다. curl 에 `Sec-Fetch-Dest: iframe` 헤더를 넣고 반복 호출해 실측했다.


</details>

<details>
<summary><strong>21. 한 컬럼 두 표현: 해석 로직은 소비자 전원이 공유해야 한다</strong></summary>

**문제**: 작업물 카드의 연도 자리에 `{"start":{"year":2024,...}}` 같은 JSON 원문이 그대로 보였다.

**원인**: 편집기는 기간 입력을 JSON 문자열로 `year` 컬럼에 저장하는데, 목록 화면은 그 값을 그대로 출력했다. 기간을 문자열로 조립하는 로직은 편집기 미리보기에만 있었다.

**해결**: `parseStoredPeriod` 와 `formatWorkYear` 유틸을 분리해 저장값이 JSON 기간이면 언어에 맞는 기간 문자열로, 아니면 원문 그대로 보여 준다. 연도를 그리는 컴포넌트들이 이 유틸을 공유한다.

**인사이트**: 한 컬럼에 두 가지 표현(평문과 JSON)이 공존하면, 해석 로직은 유틸로 한 곳에 두고 모든 소비자가 공유해야 한다. 편집기에만 두면 공개 화면이 원문을 노출한다.


</details>

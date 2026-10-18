# Trouble Shooting

> 개발하며 부딪힌 문제 64건의 원인과 해결 기록입니다. 각 항목은 증상 → 원인 → 해결 → 결론 순서이고, 제목은 문제에 들어 있는 기술적 개념을 앞세워 붙였습니다. 다른 곳에서도 통하는 원리를 남긴 10건이 Top 10 입니다.

## [Top 10 · Deep Dives](troubleshooting/top10.md)

1. 번들 타깃 다운레벨링: 테스트는 통과하는데 브라우저에서만 죽는 정규식
2. CSS 무효화 범위: `:has(:hover)` 와 universal 자손이 부르는 전역 재계산
3. 리소스 우선순위와 스트리밍 공개: LCP 를 미는 직렬 관문
4. 시간표가 아니라 상태 신호: 전환 덮개는 경로 커밋에 맞춰 걷는다
5. 정적 프리렌더의 문맥 부재: 경로를 모르는 404 가 만드는 하이드레이션 불일치
6. shorthand 리셋과 특이도: 전역 transition 이 컴포넌트 전환을 지운다
7. Backdrop Root: backdrop-filter 와 mix-blend-mode 가 서로의 입력이 못 되는 이유
8. 쓰기 경쟁과 서버 재할당: 병렬 PATCH 가 순서를 뒤섞는다
9. 폴백 조건 설계: '결과가 비었다' 와 '원천을 못 읽었다' 는 다르다
10. 패키지 의존성 해석: optional peer 도 '해결 가능해야 통과' 다

## [아키텍처 · 데이터](troubleshooting/architecture-data.md)

11. React 재조정: 같은 자리의 컴포넌트 타입이 바뀌면 서브트리가 리마운트된다
12. 자동저장 설계: 저장하지 않을 조건과 복원해도 되는 조건
13. SSR 포함 여부: 첫 화면을 덮는 오버레이는 서버 HTML 에 실려야 한다
14. 소프트 삭제와 복구성: 되살리려면 삭제가 파괴적이면 안 된다
15. 서버 쿠키와 클라 내비게이션: 인증 상태가 바뀌면 전체 리로드
16. 외부 서비스 신뢰성 측정: 콘솔 오류가 아니라 상태 코드 분포로
17. 한 컬럼 두 표현: 해석 로직은 소비자 전원이 공유해야 한다

## [성능](troubleshooting/performance.md)

18. 첫 로드 줄이기: 서드파티 스크립트와 미사용 글꼴 걷어내기
19. 메인 스레드 vs 컴포지터: 무한 애니메이션과 mousemove 리렌더
20. 클라이언트 이미지 압축: 전송 전에 줄이는 파이프라인

## [레이아웃 · CSS](troubleshooting/layout-css.md)

21. 다국어 공간 예약: em 기반 min-height 로 시프트 방지
22. var() 의 조용한 실패: 미정의 토큰은 선언을 무효화한다
23. backdrop-filter 가 안 보일 때: 격리, transform, 접두어
24. 전환의 시작값: 마운트 프레임에 최종 상태면 전환은 없다
25. blend 의 합성 단위: 자식 예외는 DOM 분리로만 가능하다
26. 독립 그리드의 트랙 계산: 한 행의 min-width 는 전파되지 않는다
27. JS 보조 masonry: 픽셀 트랙과 측정 기반 span
28. sticky anchor 감지: rootMargin 은 실제 top 과 일치해야 한다
29. 직렬화된 인라인 스타일: 저장된 값이 CSS 를 이긴다
30. viewport meta 의 적용 범위: 데스크톱은 width 를 무시한다
31. 원자 인라인 박스: 칩은 줄 사이에서 조각나지 못한다
32. 전역 기본값과 스코프 변수: strong 색을 fallback 으로 가르기

## [Plate 에디터](troubleshooting/plate-editor.md)

33. 인라인 흐름 보존: 인라인 void 안의 div 가 커서를 막는다
34. 직렬화 round-trip: 커스텀 속성은 인코딩해야 살아남는다
35. 제스처 분기: 드래그와 리사이즈가 한 요소에서 겹칠 때
36. 스크롤 컨테이너 경계: 떠 있는 요소의 배치 판정
37. 잎 블록과 wrapper: '현재 블록' 판정은 위로 올라가야 한다
38. 참조 정합성: 고아 노드는 역순으로 지운다
39. 한 클릭 두 의도: 링크의 이동과 편집을 가르기
40. 기본값이 방어하던 것: selection affinity 오버라이드의 대가
41. 흐름 밖과 문단 안: float 이미지와 inline void 의 충돌
42. scroll 이벤트의 전파: 중첩 스크롤은 캡처 단계에서 듣는다
43. IME 조합 보호: 편집 모델 밖 입력과 부모 재렌더 미루기
44. native drag 차단: pointer 드래그와 공존할 수 없다
45. 값 타입 정규화: 숫자 노드값과 문자열 옵션
46. history 스냅숏: '방금 그 변환만' 되돌리기

## [마크다운 · 콘텐츠 렌더링](troubleshooting/content-rendering.md)

47. 렌더 전 완성 원칙: dangerouslySetInnerHTML 과 DOM 조작의 충돌
48. 파서 확장의 실행 순서: renderer 대신 postprocess
49. 런타임 변환과 저장값의 괴리: 에디터에서만 재생되는 URL
50. React 밖의 DOM: native 리스너와 MutationObserver
51. 단일 소스화: 미리보기와 상세가 같은 컴포넌트를 그리게
52. 댓글 체크리스트: 파서 문맥, DOMPurify 값 검사, :has() 매칭 범위

## [애니메이션 · 인터랙션](troubleshooting/animation-interaction.md)

53. 라이브러리의 진실 소스: Lenis velocity 는 이벤트 안에서 읽는다
54. 스크롤 위치 래핑: 세트 복제보다 위치 순환
55. 뷰포트 의존 초기화: key 리마운트로 재계산
56. 상태와 동기 ref: 모드 전환의 잔상 리셋
57. enter/leave 비대칭: transition-delay 의 한계와 hover 영역
58. 포인터 캡처와 클릭: 캡처는 드래그가 시작된 뒤에 건다
59. drag 중의 이벤트 정지: dragover 로 좌표를 잇는다
60. 축 기반 휠 라우팅: 통짜 prevent 는 세로까지 막는다
61. 라이브러리 규약 밖의 이벤트: preventDefault 와 opt-out 표시의 짝
62. 링크가 공짜로 주는 것들: 캔버스에선 전부 다시 만든다

## [컴포넌트 · 기타](troubleshooting/components-misc.md)

63. 연속 입력과 transition: resize 스트림 중엔 snap
64. 글리프 존재 판별: 폭 측정과 path 로 굳히기

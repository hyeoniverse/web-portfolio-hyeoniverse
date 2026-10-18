# Trouble Shooting: 성능

[← 전체 목차](../troubleshooting.md)

<details>
<summary><strong>18. 첫 로드 줄이기: 서드파티 스크립트와 미사용 글꼴 걷어내기</strong></summary>

**증상**: Lighthouse 모바일 Performance 점수가 48점이었다. LCP 는 17.1초, TTI 는 18.2초였다. 1차 개선 뒤에도 60점(LCP 7.3초, TTI 13.7초)에 머물렀다.

**원인**: 첫 로드에 쓰지 않는 리소스가 실려 있었다.

1. reCAPTCHA v3 의 `GoogleReCaptchaProvider` 가 앱 전체를 감싸서 초기 로드 때 약 784KB 의 JS 를 받았다.
2. 1차 개선으로 reCAPTCHA 를 사용자 상호작용 뒤에 불러오게 했지만 4초 타이머 폴백과 scroll 트리거가 남아 있었다. Lighthouse 측정 중에 이 조건이 충족되어 여전히 스크립트를 받았다.
3. CSS 가 참조하지 않는 글꼴 4종(IBM Plex Mono, Bebas Neue, Cormorant Garamond, Abril Fatface)을 `next/font/google` 으로 등록해 두었다. `next/font` 의 `preload` 기본값은 `true` 라서 레이아웃에서 불러온 글꼴은 CSS 에서 쓰지 않아도 내려받는다. Inter 도 쓰지 않는 800, 900 가중치까지 등록되어 있었다.
4. reCAPTCHA 를 첫 로드에서 뺀 뒤에도 Google 도메인 preconnect 가 남아 "unused preconnect" 경고가 났다.

**해결**: 쓰지 않는 글꼴 4종을 제거하고 Inter 가중치를 7개에서 5개로 줄였다. reCAPTCHA 의 타이머와 scroll 트리거를 빼고 click, touchstart, keydown 같은 의도적인 상호작용에만 반응하게 했다. 쓰지 않게 된 preconnect 도 지웠다. 이 단계에서 Performance 는 60점에서 98점으로, LCP 는 7.3초에서 2.0초로 줄었고 페이지 용량은 70% 줄었다.

지금은 reCAPTCHA 를 연락 서랍이 열릴 때만 불러온다. `RecaptchaProvider` 의 `load()` 가 스크립트를 head 에 넣고, 서랍이 닫히면 `unload()` 가 스크립트와 iframe, 배지를 제거한다.

**결론**: 서드파티 스크립트는 그 기능을 실제로 쓰는 시점에 불러와야 한다. 타이머 폴백은 측정 도구에서도 발동하므로 지연 로딩의 조건으로 적합하지 않다. `next/font` 로 등록한 글꼴은 CSS 참조와 무관하게 내려받으므로 실제 사용 여부를 주기적으로 확인해야 한다.


</details>

<details>
<summary><strong>19. 메인 스레드 vs 컴포지터: 무한 애니메이션과 mousemove 리렌더</strong></summary>

**증상**: 홈 화면에서 무한 반복 애니메이션과 마우스 반응 효과가 메인 스레드를 계속 점유했다.

**원인**: 두 가지가 있었다.

1. Hero 타원 회전은 Framer Motion 으로, 마퀴 트랙은 GSAP `repeat: -1` 로 돌았다. 둘 다 JS 가 매 프레임 값을 계산하므로 메인 스레드에서 실행된다.
2. `useMagneticRepel` 은 `mousemove` 마다 `setMagneticOffsets()` 로 React state 를 바꿨다. 마우스를 움직이는 동안 초당 최대 60번 `WorksSection` 전체가 다시 렌더링됐다.

**해결**: Hero 타원과 마퀴는 CSS animation 으로 바꿨다. `transform` 만 바꾸는 CSS 애니메이션은 컴포지터 스레드에서 실행된다. `useMagneticRepel` 은 목표값과 현재값을 ref 에 두고, requestAnimationFrame 루프에서 `el.style.transform` 을 직접 바꾸게 했다.

**결론**: rotate, translate 같은 단순 무한 애니메이션은 JS 보다 CSS animation 이 효율적이다. mousemove 처럼 빈도가 높은 이벤트에서 React state 를 바꾸면 매번 컴포넌트 트리가 재조정되므로, ref 와 직접 DOM 조작을 쓰는 것이 맞다.


</details>

<details>
<summary><strong>20. 클라이언트 이미지 압축: 전송 전에 줄이는 파이프라인</strong></summary>

**증상**: 선택한 이미지를 원본 그대로 업로드했다. 스마트폰 사진(5~15MB)은 10MB 제한에 걸려 실패했고, 제한 이하 파일도 필요 이상으로 큰 원본이 전송됐다.

**원인**: 업로드 함수에 클라이언트 압축 단계가 없었다. 서버가 용량 초과를 거부하는 것이 유일한 방어선이었다.

**해결**: 업로드 전에 브라우저에서 단계적으로 압축한다(`src/lib/compressImage.ts`).

1. SVG 와 GIF 는 건너뛴다. 벡터와 애니메이션은 Canvas 로 변환할 수 없다.
2. 이미 용량 이하이면 건너뛴다.
3. `canvas.toBlob` 으로 WebP(quality 0.85)로 변환한다.
4. 아직 크면 긴 변을 최대 2560px 로 줄인다.
5. 그래도 크면 quality 를 0.05씩 낮추며 최저 0.7 까지 시도한다.

압축 모듈은 편집기에서 dynamic import 로 불러오므로 초기 번들 크기에 영향을 주지 않는다.

**결론**: 이미지 압축은 전송 전에 클라이언트에서 하면 대역폭과 스토리지를 함께 줄일 수 있다. 서버의 용량 검사는 마지막 방어선으로 남긴다.


</details>

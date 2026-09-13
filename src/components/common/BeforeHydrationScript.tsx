/**
 * 하이드레이션 전에 한 번 도는 인라인 스크립트. 서버 HTML 을 파싱하는 그 자리에서 실행되므로, 바로 앞까지 그려진 DOM 을
 * 첫 페인트 전에 손볼 수 있다.
 *
 * React 가 만든 `<script>` 는 페이지 이동(브라우저 렌더)에서 실행되지 않으면서 개발 모드 경고를 낸다. 그래서 감춘 div 의
 * innerHTML 로 넣는다. 서버 HTML 에서는 실행되고, 페이지 이동으로 그릴 때는 실행되지도 경고하지도 않는다. 페이지 이동에
 * 필요한 일은 쓰는 쪽이 effect 로 따로 한다. code 에 `</script>` 가 들어가면 안 된다.
 *
 * code 를 함수의 toString() 으로 만들면 서버 번들과 브라우저 번들의 문자열이 다르다. 실행되는 것은 서버 HTML 의 것뿐이라
 * 하이드레이션 비교는 끈다(suppressHydrationWarning).
 */
export default function BeforeHydrationScript({ code }: { code: string }) {
  return <div hidden suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `<script>${code}</script>` }} />;
}

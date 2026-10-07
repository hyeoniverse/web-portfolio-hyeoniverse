/*
 * MacFolio(macfolio.hyeoniverse.com)의 휴대폰 화면은 이 사이트를 iframe으로 띄우고, 위의 상태 표시줄 뒤를
 * 이 페이지 맨 위 색으로 칠해 머리 막대가 위까지 이어진 것처럼 보이게 한다 (iOS Safari처럼).
 * 다른 도메인이라 MacFolio가 이 페이지를 직접 읽을 수 없어서, 페이지가 맨 위 색을 알려 준다.
 * iframe 안에서 열렸을 때만 움직이고, 혼자 열면 아무것도 하지 않는다.
 */
(function () {
  if (window.parent === window) return;

  var MESSAGE = "macfolio:bar-color";
  var last = null;
  var frame = 0;

  /** 칠해진 색인지 (투명이 아닌지) */
  function painted(color) {
    return color && color !== "transparent" && !/^rgba\(.*,\s*0\)$/.test(color);
  }

  /** 맨 위 가운데에 보이는 요소부터 부모로 올라가며 처음 만나는 칠한 바탕색. 없으면 문서 바탕(흰색) */
  function topColor() {
    for (var element = document.elementFromPoint(window.innerWidth / 2, 1); element; element = element.parentElement) {
      var color = getComputedStyle(element).backgroundColor;
      if (painted(color)) return color;
    }
    return "rgb(255, 255, 255)";
  }

  function send() {
    frame = 0;
    var color = topColor();
    if (color === last) return;
    last = color;
    // 색만 보낸다 (알려져도 괜찮은 값). MacFolio의 주소(배포, 미리보기, 로컬)가 여럿이라 받는 곳을 정하지 않는다
    window.parent.postMessage({ type: MESSAGE, color: color }, "*");
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(send);
  }

  // 처음 열 때, 스크롤, 크기 바뀜, 화면 모드(라이트·다크) 바뀜. 그 밖의 변화(화면 전환 등)는 1초마다 확인한다
  window.addEventListener("load", schedule);
  window.addEventListener("scroll", schedule, { passive: true, capture: true });
  window.addEventListener("resize", schedule);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", schedule);
  new MutationObserver(schedule).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-theme"],
  });
  setInterval(schedule, 1000);
  schedule();
})();

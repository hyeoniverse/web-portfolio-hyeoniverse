// SEO 체크리스트에서 항목 클릭으로 이동한 필드를, 사용자가 상호작용하기 전까지 blink 시킨다.
// 한 번에 하나의 필드만 활성 — 모듈 레벨로 추적.
let activeEl: HTMLElement | null = null;
let cleanup: (() => void) | null = null;

/** 현재 blink 중인 강조를 즉시 해제한다. */
export function clearSeoFlash() {
  if (activeEl) {
    activeEl.classList.remove("seo-flash");
    activeEl = null;
  }
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
}

/** 해당 필드의 label(없으면 필드 자체)을 강조 + blink 하고, 사용자가 상호작용하면 해제한다. */
export function flashSeoField(el: HTMLElement) {
  clearSeoFlash();
  const target = el.querySelector<HTMLElement>("label") ?? el;
  target.classList.add("seo-flash");
  activeEl = target;
  // 이동을 트리거한 클릭/포커스가 즉시 해제하지 않도록 한 프레임 뒤에 리스너 부착
  requestAnimationFrame(() => {
    const onInteract = () => clearSeoFlash();
    document.addEventListener("pointerdown", onInteract, true);
    document.addEventListener("keydown", onInteract, true);
    cleanup = () => {
      document.removeEventListener("pointerdown", onInteract, true);
      document.removeEventListener("keydown", onInteract, true);
    };
  });
}

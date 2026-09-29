/**
 * 리더뷰 토글 — 편집기의 토글 블록은 `<div data-toggle [data-open]>` 로 저장되는데(plateSerializer),
 * 읽기 화면엔 여닫는 동작이 없어 접어 둔 내용까지 늘 펼쳐진 채 보였다.
 * 첫 자식을 제목 단추로 삼아 누르면 data-open 을 켜고 끈다. 보이고 숨기는 것은 CSS(.prose-content [data-toggle]).
 */
export function enhanceToggles(root: HTMLElement): () => void {
  const offs: Array<() => void> = [];
  root.querySelectorAll<HTMLElement>("[data-toggle]").forEach((box) => {
    const head = box.firstElementChild as HTMLElement | null;
    if (!head || head.dataset.toggleHead) return;
    head.dataset.toggleHead = "true";
    head.setAttribute("role", "button");
    head.tabIndex = 0;
    const sync = () => head.setAttribute("aria-expanded", box.hasAttribute("data-open") ? "true" : "false");
    const flip = () => { box.toggleAttribute("data-open"); sync(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } };
    sync();
    head.addEventListener("click", flip);
    head.addEventListener("keydown", onKey);
    // 표시까지 지워야 effect 가 다시 돌 때(StrictMode 이중 실행 · 본문 갱신) 리스너를 새로 붙인다
    offs.push(() => {
      head.removeEventListener("click", flip);
      head.removeEventListener("keydown", onKey);
      delete head.dataset.toggleHead;
    });
  });
  return () => offs.forEach((f) => f());
}

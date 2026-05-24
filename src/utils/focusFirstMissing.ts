/**
 * 필수 필드 비어있을 때 첫 빠진 필드 wrapper 로 scroll + focus.
 *
 * 사용:
 * - 각 필수 field wrapper 에 `data-required="<name>"` 추가
 * - validation 후 `focusFirstMissingField("<name>")` 호출
 */
export function focusFirstMissingField(field: string): void {
  const el = document.querySelector<HTMLElement>(`[data-required="${field}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  // wrapper 안 첫 번째 입력 가능 요소로 focus — input / textarea / select / contenteditable
  const input = el.querySelector<HTMLElement>(
    'input:not([type="hidden"]), textarea, select, [contenteditable="true"]',
  );
  // editor 같은 contenteditable 는 약간 delay 후 focus (Plate 등이 mount 시간 필요)
  setTimeout(() => input?.focus({ preventScroll: true }), 50);
}

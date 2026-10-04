/**
 * top layer(docs/design-system.md 3.10-1) — 화면 위에 뜨는 것은 z-index 가 아니라 브라우저의 top layer 에 올린다.
 *
 * - 모달 · 드로어는 `<dialog>` + `showModal()`, 떠 있는 것(팝오버 · 툴팁 · 셀렉트 목록 · 피커)은 `popover="manual"` + `showPopover()`.
 * - top layer 는 나중에 연 것이 위다. 그래서 늘 맨 위여야 하는 것(커서 · 로딩 화면 · 페이지 전환)은 여기 등록해 두고,
 *   무엇이든 새로 뜰 때마다 닫았다 다시 열어 맨 위로 올린다(`keepOnTop`). 같은 틱 안이라 깜빡이지 않는다.
 * - 모달이 열려 있는 동안 그 밖의 것은 inert 다 — 모달 안에서 연 팝오버는 모달 DOM 안으로 portal 해야 눌린다
 *   (`PortalContainerContext`). 커서 · 로딩처럼 누를 일이 없는 것은 밖에 있어도 된다.
 */

type Persistent = { el: HTMLElement; priority: number };
const persistent: Persistent[] = [];

const isOpen = (el: HTMLElement) => el.matches(":popover-open");

function rawShow(el: HTMLElement) {
  if (!el.isConnected || isOpen(el)) return;
  try {
    el.showPopover();
  } catch {
    /* popover 를 모르는 브라우저 — z-index 로 남는다 */
  }
}

function rawHide(el: HTMLElement) {
  if (!isOpen(el)) return;
  try {
    el.hidePopover();
  } catch {
    /* 무시 */
  }
}

/** 등록된 것들을 우선순위 낮은 것부터 다시 띄운다 — 높은 것이 맨 위에 온다 */
function raisePersistent() {
  const sorted = [...persistent].sort((a, b) => a.priority - b.priority);
  for (const { el } of sorted) {
    if (!el.isConnected) continue;
    rawHide(el);
    rawShow(el);
  }
}

/** 떠 있는 것을 띄운다. 요소에 `popover="manual"` 이 있어야 한다 */
export function showPopover(el: HTMLElement) {
  rawShow(el);
  raisePersistent();
}

export function hidePopover(el: HTMLElement) {
  rawHide(el);
}

/** 모달을 띄운다 — 뒤 화면이 inert 가 되고 Esc · 포커스 가둠은 브라우저가 한다 */
export function showModal(dialog: HTMLDialogElement) {
  if (!dialog.isConnected || dialog.open) return;
  try {
    dialog.showModal();
  } catch {
    /* 무시 */
  }
  raisePersistent();
}

/**
 * 늘 맨 위여야 하는 것을 등록한다(커서 3 · 로딩 2 · 페이지 전환 1). 속성은 여기서 붙인다 —
 * 서버 HTML 에 `popover` 가 있으면 hydration 전까지 보이지 않아서(로딩 화면), 올라온 뒤에 붙인다.
 * 돌려주는 함수로 해제한다.
 */
export function keepOnTop(el: HTMLElement, priority: number): () => void {
  if (!el.hasAttribute("popover")) el.setAttribute("popover", "manual");
  persistent.push({ el, priority });
  raisePersistent();
  return () => {
    const i = persistent.findIndex((p) => p.el === el);
    if (i >= 0) persistent.splice(i, 1);
    rawHide(el);
  };
}

/* ── 모달 안의 portal 층 — 커서처럼 top layer 에 못 올리는 것이 맨 위 모달 안으로 들어갈 자리 ──
   Modal 이 층 요소를 붙이고 떼며 알리고, 쓰는 쪽은 useSyncExternalStore 로 맨 위 것을 읽는다 */
const modalHosts: HTMLElement[] = [];
const modalHostListeners = new Set<() => void>();
function notifyModalHosts() {
  for (const fn of modalHostListeners) fn();
}
export function registerModalHost(el: HTMLElement): () => void {
  modalHosts.push(el);
  notifyModalHosts();
  return () => {
    const i = modalHosts.indexOf(el);
    if (i >= 0) modalHosts.splice(i, 1);
    notifyModalHosts();
  };
}
export function subscribeModalHost(fn: () => void): () => void {
  modalHostListeners.add(fn);
  return () => { modalHostListeners.delete(fn); };
}
/** 맨 위 모달의 portal 층. 모달이 없으면 null */
export function getTopModalHost(): HTMLElement | null {
  return modalHosts[modalHosts.length - 1] ?? null;
}


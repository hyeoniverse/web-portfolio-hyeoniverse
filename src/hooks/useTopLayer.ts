"use client";

import { useCallback, useRef, type Ref } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";
import { keepOnTop, showModal, showPopover } from "@/lib/topLayer";

function assign<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else (ref as { current: T | null }).current = value;
}

/**
 * `popover="manual"` 요소를 붙는 순간 top layer 에 띄우는 콜백 ref(3.10-1).
 * 요소가 사라지면 브라우저가 알아서 내린다 — AnimatePresence 의 퇴장 중에도 떠 있다.
 * 다른 ref 를 같이 넘기면 그쪽에도 넣어 준다.
 */
export function usePopoverRef<T extends HTMLElement>(forward?: Ref<T>) {
  const forwardRef = useRef(forward);
  useSyncRef(forwardRef, forward);
  return useCallback((el: T | null) => {
    assign(forwardRef.current, el);
    if (el) showPopover(el);
  }, []);
}

/** `<dialog>` 를 붙는 순간 `showModal()` 하는 콜백 ref */
export function useDialogRef(forward?: Ref<HTMLDialogElement>) {
  const forwardRef = useRef(forward);
  useSyncRef(forwardRef, forward);
  return useCallback((el: HTMLDialogElement | null) => {
    assign(forwardRef.current, el);
    if (el) showModal(el);
  }, []);
}

/** 늘 맨 위여야 하는 것(커서 · 로딩 · 페이지 전환)의 콜백 ref — 등록하고, 떨어지면 해제한다 */
export function useKeepOnTopRef<T extends HTMLElement>(priority: number, forward?: Ref<T>) {
  const forwardRef = useRef(forward);
  useSyncRef(forwardRef, forward);
  const release = useRef<(() => void) | null>(null);
  return useCallback(
    (el: T | null) => {
      assign(forwardRef.current, el);
      release.current?.();
      release.current = el ? keepOnTop(el, priority) : null;
    },
    [priority],
  );
}

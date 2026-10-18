"use client";

/* 라이브러리 여러 개 고르기 — 다섯 목록(업로드한 파일 · 커버 기록 · 댓글 이미지 · 이모지 · 달력)이 같이 쓴다.
   고르기 상태(useLibrarySelection), 고르기 줄(LibraryBulkBar), 여러 개 지우기(runBulk). */
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent } from "react";
import Button from "@/components/ui/Button";
import { useLanguage } from "@/providers/LanguageProvider";
import { showToast, useToastStore } from "@/stores/toastStore";
import { fillTemplate } from "@/utils/format";
import lib from "./Library.module.css";

/**
 * 고른 열쇠들. 목록이 바뀌어(지움 · 쪽 넘김 · 걸러 보기) 보이지 않거나 고를 수 없게 된 것은 빼고 센다 —
 * 상태를 따로 고치지 않고 그릴 때 거른다.
 */
export function useLibrarySelection<T>(items: readonly T[] | null | undefined, keyOf: (item: T) => string, canSelect: (item: T) => boolean = () => true) {
  const [raw, setRaw] = useState<ReadonlySet<string>>(() => new Set());
  const selectable = useMemo(() => (items ?? []).filter(canSelect), [items, canSelect]);
  const selectableKeys = useMemo(() => new Set(selectable.map(keyOf)), [selectable, keyOf]);
  const selected = useMemo(() => selectable.filter((it) => raw.has(keyOf(it))), [selectable, raw, keyOf]);

  const toggle = useCallback((item: T, on: boolean) => {
    const k = keyOf(item);
    setRaw((prev) => {
      const next = new Set(prev);
      if (on) next.add(k); else next.delete(k);
      return next;
    });
  }, [keyOf]);
  const selectAll = useCallback(() => setRaw(new Set(selectableKeys)), [selectableKeys]);
  const clear = useCallback(() => setRaw(new Set()), []);
  const isSelected = useCallback((item: T) => raw.has(keyOf(item)) && selectableKeys.has(keyOf(item)), [raw, keyOf, selectableKeys]);

  return { selected, count: selected.length, selectableCount: selectable.length, isSelected, toggle, selectAll, clear };
}

/** 칸을 눌러 고를 때 — 칸 안의 단추 · 링크 · 입력(복사 · 열기 · 지우기 · 고르기 상자)을 누른 것은 빼고 */
export function isInnerControl(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest("a, button, input, label, textarea, select, [role='button']");
}

/* 고를 수 없는 칸을 누르면 까닭을 알린다. 칸 안 단추 · 링크는 제 일이라 빼고, 흐린 고르기 상자는 고르려는 시도로 본다.
   계속 눌러도 알림이 쌓이지 않게 앞의 것을 지우고 띄운다 */
let unselectableToast: string | null = null;
export function notifyUnselectable(e: MouseEvent<HTMLElement>, message: string) {
  const target = e.target;
  if (target instanceof Element && isInnerControl(target) && !target.closest("label")?.querySelector("input[type='checkbox']")) return;
  if (unselectableToast) useToastStore.getState().dismissToast(unselectableToast);
  unselectableToast = showToast(message, "info");
}

/**
 * 칸을 눌러 · 끌어서 고른다 — 마우스로 한 칸을 누른 채 다른 칸으로 끌면 지나간 칸이 모두 처음 칸과 같은 상태가 된다
 * (처음 칸이 안 골라져 있었으면 다 고르고, 골라져 있었으면 다 푼다). 터치는 끌면 화면이 밀려야 해서 누르기(탭)만.
 * blocked — 여기서 시작하지 않을 곳. 기본은 칸 안의 단추 · 링크 · 입력(isInnerControl)
 */
export function useDragSelect<T>(sel: { isSelected: (item: T) => boolean; toggle: (item: T, on: boolean) => void }) {
  const drag = useRef<{ on: boolean } | null>(null);
  useEffect(() => {
    const end = () => { drag.current = null; };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  return (item: T, opts: { enabled?: boolean; blocked?: (target: EventTarget | null) => boolean } = {}) => {
    const enabled = opts.enabled ?? true;
    const blocked = opts.blocked ?? isInnerControl;
    return {
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (!enabled || e.pointerType === "touch" || e.button !== 0 || blocked(e.target)) return;
        /* 끄는 동안 글자가 칠해지지 않게 */
        e.preventDefault();
        const on = !sel.isSelected(item);
        drag.current = { on };
        sel.toggle(item, on);
      },
      onPointerEnter: (e: PointerEvent<HTMLElement>) => {
        if (!enabled || !drag.current || !(e.buttons & 1)) return;
        sel.toggle(item, drag.current.on);
      },
      /* 사진 · 영상 칸은 끌면 브라우저가 그림 끌기를 시작해 포인터가 끊겼다(pointercancel) — 고를 수 있는 칸에서는 막는다 */
      onDragStart: (e: DragEvent<HTMLElement>) => {
        if (enabled) e.preventDefault();
      },
      /* 터치는 누르기(탭)로 — 마우스는 위 pointerdown 이 이미 골랐다 */
      onClick: (e: MouseEvent<HTMLElement>) => {
        if (!enabled || blocked(e.target)) return;
        if ((e.nativeEvent as globalThis.PointerEvent).pointerType !== "touch") return;
        sel.toggle(item, !sel.isSelected(item));
      },
    };
  };
}

/** 여러 개를 나눠 처리한다 — 한 번에 limit 개씩. 실패한 것을 돌려준다(하나가 실패해도 나머지는 계속) */
export async function runBulk<T>(items: readonly T[], fn: (item: T) => Promise<boolean>, limit = 4): Promise<{ ok: T[]; failed: T[] }> {
  const ok: T[] = [];
  const failed: T[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      const done = await fn(item).catch(() => false);
      (done ? ok : failed).push(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return { ok, failed };
}

/** 지운 결과 알림 글 — 모두 됐으면 "n개를 지웠습니다", 일부 실패면 실패 수도 */
export function useBulkResultText() {
  const { t } = useLanguage();
  return (ok: number, failed: number) =>
    failed
      ? fillTemplate(t("admin.inline.libraryBulk.partial"), { ok, failed })
      : fillTemplate(t("admin.inline.libraryBulk.done"), { n: ok });
}

/** 고르면 목록 위에 뜨는 줄 — 몇 개 골랐는지 · 모두 선택 · 선택 해제 · 지우기 */
export function LibraryBulkBar({ count, selectableCount, onSelectAll, onClear, onDelete, deleting = false, deleteLabel }: {
  count: number;
  selectableCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onDelete: () => void;
  deleting?: boolean;
  /** 지우기 단추 글 — 기록에서 빼기 · 휴지통으로 처럼 목록마다 다르다 */
  deleteLabel: string;
}) {
  const { t } = useLanguage();
  /* 고르기 전에도 늘 보인다 — 단추는 자리를 지키고 할 일이 없을 때만 disabled(줄이 나타났다 사라지며 목록이 밀리지 않게) */
  return (
    <div className={lib.bulkBar} role="toolbar" aria-label={t("admin.inline.libraryBulk.toolbar")}>
      <span className={lib.bulkCount}>{fillTemplate(t("admin.inline.libraryBulk.selected"), { n: count })}</span>
      <Button variant="ghost" shape="capsule" onClick={onSelectAll} disabled={count >= selectableCount} soundDisabled>
        {fillTemplate(t("admin.inline.libraryBulk.selectAll"), { n: selectableCount })}
      </Button>
      <Button variant="ghost" shape="capsule" onClick={onClear} disabled={count === 0} soundDisabled>{t("admin.inline.libraryBulk.clear")}</Button>
      <Button variant="outline" tone="danger" className={lib.bulkDelete} loading={deleting} disabled={count === 0} onClick={onDelete}>
        {fillTemplate(deleteLabel, { n: count })}
      </Button>
    </div>
  );
}

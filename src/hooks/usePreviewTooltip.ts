"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";
import { useRouter } from "next/navigation";

interface HasId { id: string }

/** 사라지는 효과 길이(ms) — AdminListShell.module.css 의 tooltipOut 과 같게 */
const EXIT_MS = 160;
/** 따라오는 스프링 — k 가 클수록 빨리 붙는다. c 는 넘치지 않을 만큼(감쇠비 약 1) — 넘쳤다 돌아오면 흔들려 보였다 */
const SPRING = { k: 260, c: 32 };

interface UsePreviewTooltipOptions {
  /** 이미지 유무 판별 함수. 기본: item.cover_image */
  hasImage?: (item: unknown) => boolean;
}

/**
 * Admin 리스트 페이지의 프리뷰 툴팁 로직을 캡슐화.
 * - 데스크톱: hover → 툴팁, 클릭 → 편집
 * - 모바일: 첫 탭 → 툴팁, 두 번째 탭 → 편집
 */
export function usePreviewTooltip<T extends HasId>(editBasePath: string, options?: UsePreviewTooltipOptions) {
  const checkImage = useMemo(() => options?.hasImage ?? ((item: unknown) => !!(item as { cover_image?: string }).cover_image), [options?.hasImage]);
  const router = useRouter();
  /* 떠 있는 미리보기. key 는 보일 때·숨길 때·이미지 오류 때마다 올려 툴팁을 새로 그린다.
     예전에는 항목·위치·이미지 오류를 ref 에 두고 key 상태만 올려 다시 그리게 했는데, 렌더가 ref 를
     읽으면 ref 만 바뀐 렌더를 놓칠 수 있다. 다시 그리는 횟수는 같다(보일 때·숨길 때 한 번씩). */
  /* open — 떠 있는 중인지. 닫을 때는 open 만 내리고 item 은 사라지는 효과가 끝난 뒤(EXIT_MS) 비운다.
     열려 있거나 사라지는 중에 다른 행으로 옮기면 key 를 그대로 두고 item 만 바꾼다 — 툴팁을 새로 그리면
     등장 효과가 행마다 처음부터 다시 걸려 "갑자기 생기는" 느낌이 났다. */
  const [tooltip, setTooltip] = useState<{
    key: number;
    item: T | null;
    pos: { top: number; left: number };
    imgError: boolean;
    open: boolean;
  }>({ key: 0, item: null, pos: { top: 0, left: 0 }, imgError: false, open: false });
  const exitTimer = useRef<number | undefined>(undefined);
  /* 모바일 두 번째 탭 판정은 이벤트 처리에서 지금 떠 있는 항목을 본다. 핸들러를 매번 새로 만들지
     않도록 ref 로 읽는다. */
  const shownRef = useRef<T | null>(null);
  useSyncRef(shownRef, tooltip.open ? tooltip.item : null);

  const canHover = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    canHover.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => { canHover.current = e.matches; };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* 데스크톱 — 툴팁이 포인터를 따라다닌다. 커서 오른쪽 위에 띄워 가리키는 곳(행 안 단추 포함)을 덮지 않고,
     위·오른쪽 자리가 모자라면 아래·왼쪽으로 넘긴다. 높이는 실제로 그려진 툴팁에서 잰다. */
  const calcPointerPos = useCallback((x: number, y: number, item: T, el?: HTMLElement | null) => {
    const w = el?.offsetWidth || 280;
    const h = el?.offsetHeight || (checkImage(item) ? 260 : 120);
    const off = 16;
    const left = x + off + w <= window.innerWidth - 8 ? x + off : Math.max(8, x - off - w);
    const top = y - off - h >= 8 ? y - off - h : Math.min(y + off, window.innerHeight - h - 8);
    return { top, left };
  }, [checkImage]);

  const calcPos = useCallback((el: HTMLElement, item: T) => {
    const rect = el.getBoundingClientRect();
    const w = 280;
    const h = checkImage(item) ? 260 : 120;
    const gap = 8;
    const rawLeft = rect.left + rect.width / 2 - w / 2;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - w - 8));
    const top = rect.top > h + gap ? rect.top - h - gap : rect.bottom + gap;
    return { top, left };
  }, [checkImage]);

  /** 띄운다 — 이미 떠 있거나 사라지는 중이면 같은 툴팁에 내용만 바꾼다 */
  const open = useCallback((item: T, pos: { top: number; left: number }) => {
    window.clearTimeout(exitTimer.current);
    setTooltip((t) => (t.item
      ? { ...t, item, open: true, imgError: t.item.id === item.id ? t.imgError : false }
      : { key: t.key + 1, item, pos, imgError: false, open: true }));
  }, []);

  const show = useCallback((item: T, el: HTMLElement) => {
    open(item, calcPos(el, item));
  }, [calcPos, open]);

  const hide = useCallback(() => {
    window.clearTimeout(exitTimer.current);
    setTooltip((t) => (t.item && t.open ? { ...t, open: false } : t));
    exitTimer.current = window.setTimeout(() => {
      setTooltip((t) => (t.open ? t : { ...t, key: t.key + 1, item: null }));
    }, EXIT_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(exitTimer.current), []);

  /**
   * 관리 열(수정·삭제 등)을 향한 상호작용인가.
   *
   * 태블릿·모바일에서 미리보기는 화면 가운데에 전체 backdrop 과 함께 뜬다. 열려 있는 동안
   * 관리 버튼이 그 아래 깔려서 탭이 backdrop 의 닫기로 먹힌다. 관리 열에서 시작한 탭으로는
   * 아예 열지 않아야 버튼이 첫 탭에 눌린다.
   */
  const fromRowActions = (e: React.MouseEvent): boolean =>
    !!(e.target as HTMLElement | null)?.closest?.("[data-row-actions]");

  const handleRowHover = useCallback((item: T, e: React.MouseEvent) => {
    if (!canHover.current) return;
    if (fromRowActions(e)) return;
    open(item, calcPointerPos(e.clientX, e.clientY, item));
  }, [calcPointerPos, open]);

  /* 떠 있는 동안 포인터를 스프링으로 따라간다 — 바로 붙지 않고 살짝 늦게, 넘치지 않고 매끄럽게 따라붙는다.
     위치는 상태로 올리지 않고 툴팁 요소에 바로 쓴다 —
     움직일 때마다 목록 전체가 다시 그려지지 않게. 행을 옮겨도(항목만 바뀜) 끊기지 않게 open 에만 묶는다. */
  const itemRef = useRef<T | null>(null);
  useSyncRef(itemRef, tooltip.item);
  const isOpen = tooltip.open;
  useEffect(() => {
    if (!isOpen || !canHover.current) return;
    const el = document.querySelector<HTMLElement>("[data-preview-tooltip]");
    if (!el) return;
    const cur = { x: el.offsetLeft, y: el.offsetTop, vx: 0, vy: 0 };
    const target = { x: cur.x, y: cur.y };
    let last = performance.now();
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const item = itemRef.current;
      if (!item) return;
      const { top, left } = calcPointerPos(e.clientX, e.clientY, item, el);
      target.x = left;
      target.y = top;
      /* 커서 쪽 모서리에서 커지고 줄어들게 — 커서 오른쪽 위에 떠 있으면 왼쪽 아래가 기준점 */
      el.style.transformOrigin = `${left > e.clientX ? "left" : "right"} ${top < e.clientY ? "bottom" : "top"}`;
    };
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      cur.vx += (SPRING.k * (target.x - cur.x) - SPRING.c * cur.vx) * dt;
      cur.vy += (SPRING.k * (target.y - cur.y) - SPRING.c * cur.vy) * dt;
      cur.x += cur.vx * dt;
      cur.y += cur.vy * dt;
      el.style.left = `${cur.x}px`;
      el.style.top = `${cur.y}px`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, [isOpen, calcPointerPos]);

  const handleRowLeave = useCallback(() => {
    if (!canHover.current) return;
    hide();
  }, [hide]);

  const handleRowClick = useCallback((item: T, e: React.MouseEvent) => {
    if (fromRowActions(e)) return;
    if (canHover.current) {
      router.push(`${editBasePath}/${item.id}/edit`);
      return;
    }
    if (shownRef.current?.id === item.id) {
      hide();
      router.push(`${editBasePath}/${item.id}/edit`);
      return;
    }
    show(item, e.currentTarget as HTMLElement);
  }, [router, editBasePath, show, hide]);

  const handleImgError = useCallback(() => {
    setTooltip((t) => ({ ...t, imgError: true }));
  }, []);

  return {
    tooltip,
    handleRowHover,
    handleRowLeave,
    handleRowClick,
    handleImgError,
    hideTooltip: hide,
  };
}

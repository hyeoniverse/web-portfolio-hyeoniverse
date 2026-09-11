"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";
import { useRouter } from "next/navigation";

interface HasId { id: string }

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
  const [tooltip, setTooltip] = useState<{
    key: number;
    item: T | null;
    pos: { top: number; left: number };
    imgError: boolean;
  }>({ key: 0, item: null, pos: { top: 0, left: 0 }, imgError: false });
  /* 모바일 두 번째 탭 판정은 이벤트 처리에서 지금 떠 있는 항목을 본다. 핸들러를 매번 새로 만들지
     않도록 ref 로 읽는다. */
  const shownRef = useRef<T | null>(null);
  useSyncRef(shownRef, tooltip.item);

  const canHover = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    canHover.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => { canHover.current = e.matches; };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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

  const show = useCallback((item: T, el: HTMLElement) => {
    const pos = calcPos(el, item);
    setTooltip((t) => ({ key: t.key + 1, item, pos, imgError: false }));
  }, [calcPos]);

  const hide = useCallback(() => {
    setTooltip((t) => (t.item ? { ...t, key: t.key + 1, item: null } : t));
  }, []);

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
    show(item, e.currentTarget as HTMLElement);
  }, [show]);

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
    setTooltip((t) => ({ ...t, key: t.key + 1, imgError: true }));
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

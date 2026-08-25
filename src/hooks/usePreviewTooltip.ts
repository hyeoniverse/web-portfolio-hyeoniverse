"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
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
  const hoveredRef = useRef<T | null>(null);
  const [tooltipKey, setTooltipKey] = useState(0);
  const tooltipPosRef = useRef({ top: 0, left: 0 });
  const imgErrorRef = useRef(false);

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
    hoveredRef.current = item;
    tooltipPosRef.current = calcPos(el, item);
    imgErrorRef.current = false;
    setTooltipKey((k) => k + 1);
  }, [calcPos]);

  const hide = useCallback(() => {
    if (!hoveredRef.current) return;
    hoveredRef.current = null;
    setTooltipKey((k) => k + 1);
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
    if (hoveredRef.current?.id === item.id) {
      hide();
      router.push(`${editBasePath}/${item.id}/edit`);
      return;
    }
    show(item, e.currentTarget as HTMLElement);
  }, [router, editBasePath, show, hide]);

  const handleImgError = useCallback(() => {
    imgErrorRef.current = true;
    setTooltipKey((k) => k + 1);
  }, []);

  return {
    hoveredRef,
    tooltipKey,
    tooltipPosRef,
    imgErrorRef,
    handleRowHover,
    handleRowLeave,
    handleRowClick,
    handleImgError,
    hideTooltip: hide,
  };
}

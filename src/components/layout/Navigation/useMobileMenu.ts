"use client";

import { useState, useEffect, useRef } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { useHasMounted } from "@/hooks/useHasMounted";

/**
 * 좁은 화면에서 여는 메뉴 서랍.
 *
 * 서랍이 잘려 나왔다가 펼쳐지는 연출이 있어서, 열림 여부 하나로는 부족하다.
 * 화면에 붙어 있는지(showMenu)와 펼쳐진 모양인지(menuClipOpen)를 따로 둔다.
 * 닫을 때는 접히는 연출이 끝난 뒤에 떼어 내야 해서 0.8초 뒤에 붙어 있는 상태를 끈다.
 *
 * 서랍이 열려 있는 동안에는 뒤 화면이 움직이면 안 되므로 스크롤을 잠근다. 잠글 때
 * 위치를 기억해 두었다가 풀 때 그 자리로 되돌린다.
 *
 * @param pathname     페이지가 바뀌면 닫는다
 * @param closeNotif   서랍이 열리면 알림 드롭다운도 닫는다. 겹쳐 보이기 때문이다
 * @param lenisStop    부드러운 스크롤을 멈춘다
 * @param lenisStart   부드러운 스크롤을 다시 켠다
 */
export function useMobileMenu(
  pathname: string,
  closeNotif: (open: boolean) => void,
  lenisStop: () => void,
  lenisStart: () => void,
) {
  // ── Mobile menu drawer (clip-path, ContactDrawer pattern) ──
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuClipOpen, setMenuClipOpen] = useState(false);
  const menuMounted = useHasMounted();
  // 드로어 clip 래퍼 ref — 마운트 후 강제 reflow 로 "닫힘" 상태를 트랜지션 시작점으로 확정하는 데 사용
  const clipWrapperRef = useRef<HTMLDivElement>(null);

  const pathnameChanged = useDepsChanged([pathname]);
  if (pathnameChanged) setIsMenuOpen(false);
  // drawer 열릴 때 notification dropdown 도 같이 닫음 (위로 겹쳐 보이는 거 방지)
  useEffect(() => {
    if (isMenuOpen) closeNotif(false);
  }, [isMenuOpen, closeNotif]);

  useEffect(() => {
    let rafId: number;
    let unmountTimer: ReturnType<typeof setTimeout>;

    if (isMenuOpen) {
      setShowMenu(true);
      // 드로어가 마운트(clip 닫힘)돼 ref 가 붙을 때까지 rAF 로 기다린 뒤, 강제 reflow 로 닫힘
      // 상태를 트랜지션 시작점으로 확정하고 연다. 예전 더블 rAF 는 마운트 커밋 전에 open 이
      // 세팅되면 두 렌더가 배칭돼 드로어가 처음부터 열린 채 마운트→트랜지션 스킵되는 레이스가
      // 있었다(헤드리스에선 거의 안 걸리지만 실기기 스케줄링에선 자주 걸려 "가끔만 애니됨").
      const openWhenReady = () => {
        const el = clipWrapperRef.current;
        if (!el) {
          rafId = requestAnimationFrame(openWhenReady);
          return;
        }
        void el.offsetHeight; // 강제 reflow — 닫힘 clip 을 확정
        setMenuClipOpen(true);
      };
      rafId = requestAnimationFrame(openWhenReady);
    } else {
      setMenuClipOpen(false);
      unmountTimer = setTimeout(() => {
        setShowMenu(false);
      }, 800);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(unmountTimer);
    };
  }, [isMenuOpen]);

  // ── Menu scroll lock ──
  useEffect(() => {
    if (isMenuOpen) {
      lenisStop();
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (top) window.scrollTo(0, parseInt(top, 10) * -1);
      lenisStart();
    }
  }, [isMenuOpen, lenisStop, lenisStart]);


  return { isMenuOpen, setIsMenuOpen, showMenu, menuClipOpen, menuMounted, clipWrapperRef };
}

"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSyncRef } from "./useSyncRef";
import { isPlainClick } from "@/utils/gestureUtils";

/**
 * 저장하지 않은 변경이 있는 동안, 페이지를 떠나기 전에 묻는다.
 *
 * - 새로고침·탭 닫기·주소창 이동: beforeunload. 묻는 문구는 브라우저가 정한다.
 * - 사이트 안 링크(Next Link 포함): 문서의 캡처 단계에서 클릭을 먼저 받아 `ask` 로 묻고, 괜찮다고 하면
 *   router.push 로 옮긴다. 캡처 단계라 Link 의 onClick(React 루트에 달린다)보다 먼저 돈다.
 * - 새 창·다운로드·보조 키를 누른 클릭·다른 사이트·같은 화면(해시만 다른 링크)은 건드리지 않는다.
 *   다른 사이트로 가는 링크는 beforeunload 가 묻는다.
 * - 브라우저 뒤로 가기: App Router 는 이동을 멈추는 수단을 주지 않는다. 그래서 같은 주소로 기록을
 *   하나 더 쌓아 두고(아래 "덧기록"), 뒤로 가기가 그것을 벗겨 내면 다시 쌓아 제자리에 세운 뒤 묻는다.
 *   떠나도 된다고 하면 이 화면과 **경로가 다른** 기록이 나올 때까지 물러난다. 두 칸만 물러나던 때는
 *   편집 중에 새로고침하면 그 전에 쌓아 둔 같은 주소의 기록에 내려앉아, "버리고 이동" 을 눌러도 같은
 *   화면에 머물렀다. 물러날 기록이 없으면(새 탭에서 바로 연 화면) `fallback` 으로 보낸다.
 *
 * @param ask 물을 방법. 이동해도 되면 `go` 를 부른다(예: 확인 모달의 onConfirm).
 * @param options.fallback 뒤로 가기로 떠나려는데 물러날 기록이 없을 때 갈 곳. 기본은 첫 화면
 */
/* 뒤로 가기로 떠날 때, 물러날 기록이 없다고 보는 기다림 — popstate 는 보통 수십 ms 안에 온다 */
const LEAVE_FALLBACK_MS = 600;

export function useLeaveGuard(
  active: boolean,
  ask: (go: () => void) => void,
  options: { fallback?: string } = {},
): void {
  const router = useRouter();
  const routerRef = useRef(router);
  useSyncRef(routerRef, router);
  const askRef = useRef(ask);
  useSyncRef(askRef, ask);
  const activeRef = useRef(active);
  useSyncRef(activeRef, active);
  const fallbackRef = useRef(options.fallback ?? "/");
  useSyncRef(fallbackRef, options.fallback ?? "/");
  /* 우리가 쌓아 둔 덧기록이 아직 기록 맨 위에 있는가 */
  const armed = useRef(false);
  /* 버리고 떠나는 중이면 떠나는 화면의 경로 — 그 경로의 기록은 건너뛰며 물러난다 */
  const leaving = useRef<string | null>(null);
  const leaveTimer = useRef<number | null>(null);

  /* 덧기록은 물을 일이 생겼을 때만 쌓는다. 열자마자 쌓아 두면 아무것도 고치지 않고 나가는 사람도
     뒤로 가기를 두 번 눌러야 한다 */
  useEffect(() => {
    if (!active || armed.current) return;
    window.history.pushState({ ...(window.history.state ?? {}), __leaveGuard: true }, "", window.location.href);
    armed.current = true;
  }, [active]);

  /* 뒤로 가기 — 덧기록이 벗겨지는 그 순간을 잡는다. 이 구독은 화면이 살아 있는 동안 그대로 둔다
     (active 가 오르내릴 때마다 다시 걸면 그 사이의 뒤로 가기를 놓친다) */
  useEffect(() => {
    const clearLeaveTimer = () => {
      if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    };
    /* n 칸 물러난다. 물러날 기록이 없으면 popstate 가 오지 않으니, 잠시 기다려 봐서 안 오면 fallback 으로 보낸다 */
    const stepBack = (n: number) => {
      window.history.go(-n);
      clearLeaveTimer();
      leaveTimer.current = window.setTimeout(() => {
        leaveTimer.current = null;
        if (leaving.current === null) return;
        leaving.current = null;
        routerRef.current.push(fallbackRef.current);
      }, LEAVE_FALLBACK_MS);
    };

    const onPopState = () => {
      if (leaving.current !== null) {
        clearLeaveTimer();
        /* 아직 이 화면이다 — 새로고침 전에 쌓아 둔 덧기록이거나 이 화면의 원래 기록. 한 칸 더 물러난다 */
        if (window.location.pathname === leaving.current) { stepBack(1); return; }
        leaving.current = null;
        return;
      }
      if (!armed.current) return; // 우리 기록이 아니다 — 가던 길 그대로
      armed.current = false;
      if (!activeRef.current) {
        /* 물을 이유가 사라졌다(저장했다). 덧기록만 벗겨져 화면은 그대로이므로 한 번 더 물러나
           사용자가 누른 뜻대로 떠난다 */
        window.history.back();
        return;
      }
      /* 제자리에 다시 세운다 — 답을 듣기 전에는 화면을 떠나지 않는다 */
      window.history.pushState({ ...(window.history.state ?? {}), __leaveGuard: true }, "", window.location.href);
      armed.current = true;
      askRef.current(() => {
        armed.current = false;
        /* 덧기록과 이 화면의 기록을 함께 건너뛴다 — 한 칸만 물러나면 같은 자리에 머문다.
           그래도 같은 화면이면(새로고침 전의 덧기록) 위 leaving 이 계속 물러난다 */
        leaving.current = window.location.pathname;
        stepBack(2);
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      clearLeaveTimer();
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      /* 일부 브라우저는 returnValue 가 있어야 묻는다 */
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || !isPlainClick(e)) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      askRef.current(() => router.push(url.pathname + url.search + url.hash));
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, router]);
}

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
 * - 브라우저 뒤로 가기는 막지 못한다. App Router 가 이동을 멈추는 수단을 주지 않는다.
 *
 * @param ask 물을 방법. 이동해도 되면 `go` 를 부른다(예: 확인 모달의 onConfirm).
 */
export function useLeaveGuard(active: boolean, ask: (go: () => void) => void): void {
  const router = useRouter();
  const askRef = useRef(ask);
  useSyncRef(askRef, ask);

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

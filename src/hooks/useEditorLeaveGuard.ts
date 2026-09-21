"use client";

import { useEffect, useState } from "react";
import { useDepsChanged } from "./useDepsChanged";
import { useLeaveGuard } from "./useLeaveGuard";

/* 사용자가 이 화면에서 실제로 무언가 한 순간을 알리는 사건들 — 자동저장(useEditorAutoSave)이
   "불러오기 끝의 자동 변경" 과 진짜 편집을 가르는 데 쓰는 것과 같은 목록이다 */
const USER_EVENTS = ["keydown", "pointerdown", "paste", "drop", "compositionstart", "beforeinput"] as const;

/**
 * 편집 화면을 저장하지 않고 떠나려 하면 묻는다 — useLeaveGuard 에 "언제 물을지" 를 더한 것.
 *
 * 저장본과 다른지(dirty)만 보면 못 쓴다. 화면을 열기만 해도 폼은 몇 번 바뀐다 — 연관 글·시리즈를
 * 나중에 받아 채우고, 본문 편집기가 뒤늦게 올라와 저장된 HTML 을 제 형식으로 다듬어 올린다(빈 문단
 * 줄 높이, 글과 한 문단에 섞인 이미지 분리 등). 그것까지 "저장하지 않은 변경" 으로 세면 열었다
 * 그냥 닫기만 해도 확인 창이 뜬다.
 *
 * 그래서 두 가지가 겹칠 때만 센다 — 사용자가 손을 댄 뒤에(USER_EVENTS), 폼이 바뀌었을 때.
 * 불러오기가 스스로 만드는 변경은 손대기 전에 일어나므로 걸리지 않는다. 초안 복원은 사용자가
 * 손을 댄 뒤 폼을 갈아 끼우니 걸린다 — 저장하지 않은 내용이 맞으니 묻는 게 옳다.
 */
export function useEditorLeaveGuard({ form, dirty, busy, ask, fallback }: {
  /** 폼 — 바뀔 때마다 새 객체여야 한다(setForm 으로 갈아 끼우는 그것) */
  form: unknown;
  /** 저장본과 다른가 */
  dirty: boolean;
  /** 저장하는 중인가 — 저장이 끝나면 스스로 목록으로 옮기므로 그때는 묻지 않는다 */
  busy: boolean;
  /** 물을 방법 — 이동해도 되면 `go` 를 부른다 */
  ask: (go: () => void) => void;
  /** 뒤로 가기로 떠나는데 물러날 기록이 없을 때(새 탭에서 바로 연 화면) 갈 곳 — 보통 목록 */
  fallback?: string;
}): void {
  const [acted, setActed] = useState(false);
  useEffect(() => {
    if (acted) return;
    const mark = () => setActed(true);
    for (const e of USER_EVENTS) document.addEventListener(e, mark, true);
    return () => { for (const e of USER_EVENTS) document.removeEventListener(e, mark, true); };
  }, [acted]);

  const [edited, setEdited] = useState(false);
  const formChanged = useDepsChanged([form]);
  if (!edited && acted && formChanged) setEdited(true);

  useLeaveGuard(dirty && edited && !busy, ask, { fallback });
}

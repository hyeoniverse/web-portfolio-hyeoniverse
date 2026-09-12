import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/providers/LanguageProvider";

/* 좋아요가 실패하면 마지막으로 확인한 서버 값으로 되돌리고 알리는지(#868). 예전에는 실패 응답의 본문을 반영해
   숫자 자리에 "undefined" 가 보였다. fetch 는 흉내로 대신한다 — 네트워크에 닿지 않는다. */

const toasts: string[] = [];
vi.mock("@/stores/toastStore", () => ({ showToast: (m: string) => { toasts.push(m); return "id"; } }));

import { useLikeToggle } from "@/hooks/useLikeToggle";

const wrapper = ({ children }: { children: ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;
const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });

/** GET 은 5개·안 누름, POST 는 `post` 가 정한다. signal 이 취소되면 AbortError 로 끝난다 */
function stubFetch(post: () => ReturnType<typeof reply>, delay = 5) {
  vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
    if (init?.method !== "POST") return Promise.resolve(reply(200, { count: 5, liked: false }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(post()), delay);
      init.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("aborted", "AbortError")); });
    });
  }));
}

beforeEach(() => { toasts.length = 0; });
afterEach(() => { vi.unstubAllGlobals(); });

describe("useLikeToggle", () => {
  it("실패하면 서버 값(5·안 누름)으로 되돌리고 알림 하나를 띄운다", async () => {
    stubFetch(() => reply(500, { error: "Internal server error" }));
    const r = renderHook(() => useLikeToggle({ endpoint: "/api/posts/p1/like" }), { wrapper });
    await waitFor(() => expect(r.result.current.count).toBe(5));
    act(() => r.result.current.toggle());
    expect(r.result.current).toMatchObject({ count: 6, liked: true });
    await waitFor(() => expect(r.result.current.busy).toBe(false));
    expect(r.result.current).toMatchObject({ count: 5, liked: false });
    expect(toasts).toHaveLength(1);
  });

  it("성공하면 서버가 돌려준 값을 쓰고 알림은 없다", async () => {
    stubFetch(() => reply(200, { count: 6, liked: true }));
    const r = renderHook(() => useLikeToggle({ endpoint: "/api/posts/p1/like" }), { wrapper });
    await waitFor(() => expect(r.result.current.count).toBe(5));
    act(() => r.result.current.toggle());
    await waitFor(() => expect(r.result.current.busy).toBe(false));
    expect(r.result.current).toMatchObject({ count: 6, liked: true });
    expect(toasts).toEqual([]);
  });

  it("새 토글이 이어받아 취소된 요청은 알리지 않는다", async () => {
    stubFetch(() => reply(500, { error: "Internal server error" }), 20);
    const r = renderHook(() => useLikeToggle({ endpoint: "/api/posts/p1/like" }), { wrapper });
    await waitFor(() => expect(r.result.current.count).toBe(5));
    act(() => r.result.current.toggle());
    act(() => r.result.current.toggle());
    await waitFor(() => expect(r.result.current.busy).toBe(false));
    expect(r.result.current).toMatchObject({ count: 5, liked: false });
    expect(toasts).toHaveLength(1);
  });
});

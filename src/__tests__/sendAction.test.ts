// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ko from "@/locales/ko.json";
import koAdmin from "@/locales/ko.admin.json";
import en from "@/locales/en.json";
import enAdmin from "@/locales/en.admin.json";

/* 쓰기 동작이 실패하면 화면 언어 알림을 띄우는지(#868). fetch 는 흉내로 대신한다 — 네트워크에 닿지 않는다. */

const toasts: { message: string; variant?: string }[] = [];
vi.mock("@/stores/toastStore", () => ({
  showToast: (message: string, variant?: string) => { toasts.push({ message, variant }); return "id"; },
}));

import { sendAction, sendActions, tryRequest } from "@/lib/sendAction";
import { CodedError } from "@/lib/apiError";

type Dict = Record<string, unknown>;
const tOf = (d: Dict) => (key: string) => {
  const v = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Dict)[k] : undefined), d);
  return typeof v === "string" ? v : key;
};
const tKo = tOf({ ...ko, ...koAdmin } as Dict);
const tEn = tOf({ ...en, ...enAdmin } as Dict);

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const forbidden = () => json(403, { error: "Forbidden", reason: "본인이 작성한 글만 수정할 수 있습니다.", code: "POST_OWN_ONLY", params: { level: 10 } });

beforeEach(() => { toasts.length = 0; });
afterEach(() => { vi.unstubAllGlobals(); });

describe("sendAction", () => {
  it("성공하면 읽지 않은 응답을 돌려주고 알림은 없다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(200, { success: true })));
    const res = await sendAction("/api/posts/p1/restore", { method: "POST" }, tKo, "대체");
    expect(await res!.json()).toEqual({ success: true });
    expect(toasts).toEqual([]);
  });

  it("거절되면 서버 코드의 사유를 화면 언어로 알린다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => forbidden()));
    expect(await sendAction("/api/posts/p1", { method: "DELETE" }, tEn, "fallback")).toBeNull();
    expect(toasts).toEqual([{ message: "You can only edit your own posts. Your permission level is 10.", variant: "error" }]);
  });

  it("코드가 없거나 요청이 끊기면 그 동작의 대체 문구", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(500, { error: "db down" })));
    await sendAction("/api/posts/p1/purge", { method: "DELETE" }, tKo, tKo("admin.common.purgeFailed"));
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    await sendAction("/api/posts/p1/purge", { method: "DELETE" }, tKo, tKo("admin.common.purgeFailed"));
    expect(toasts.map((x) => x.message)).toEqual(["영구 삭제하지 못했습니다.", "영구 삭제하지 못했습니다."]);
  });
});

describe("sendActions", () => {
  const reqs = (n: number) => Array.from({ length: n }, (_, i) => ({ input: `/api/posts/p${i}`, init: { method: "DELETE" } }));

  it("모두 성공하면 성공 수만 돌려준다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(200, {})));
    expect(await sendActions(reqs(3), tKo, "대체")).toBe(3);
    expect(toasts).toEqual([]);
  });

  it("일부만 실패하면 몇 개 중 몇 개인지와 사유를 알림 하나로", async () => {
    let i = 0;
    vi.stubGlobal("fetch", vi.fn(async () => (i++ === 1 ? forbidden() : json(200, {}))));
    expect(await sendActions(reqs(3), tKo, tKo("admin.common.deleteFailed"))).toBe(2);
    expect(toasts).toEqual([{ message: "3개 중 1개를 처리하지 못했습니다. 본인이 쓴 글만 고칠 수 있습니다. 지금 권한 레벨은 10입니다.", variant: "error" }]);
  });

  it("모두 실패하고 코드가 없으면 대체 문구만", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(500, { error: "db down" })));
    expect(await sendActions(reqs(2), tEn, tEn("admin.common.deleteFailed"))).toBe(0);
    expect(toasts.map((x) => x.message)).toEqual(["Couldn’t delete."]);
  });

  it("sequential 이면 앞 요청이 끝난 뒤에 다음 요청을 보낸다", async () => {
    const order: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string) => {
      order.push(`start ${input}`);
      await new Promise((r) => setTimeout(r, 5));
      order.push(`end ${input}`);
      return json(200, {});
    }));
    await sendActions(reqs(2), tKo, "대체", { sequential: true });
    expect(order).toEqual(["start /api/posts/p0", "end /api/posts/p0", "start /api/posts/p1", "end /api/posts/p1"]);
  });
});

describe("tryRequest", () => {
  it("실패를 코드가 실린 CodedError 로 돌려주고 알림은 띄우지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => forbidden()));
    const r = await tryRequest("/api/posts/export?id=p1");
    expect(r).toBeInstanceOf(CodedError);
    expect((r as CodedError).code).toBe("POST_OWN_ONLY");
    vi.stubGlobal("fetch", vi.fn(async () => json(200, { files: [] })));
    expect(await tryRequest("/api/posts/export?id=p1")).toBeInstanceOf(Response);
    expect(toasts).toEqual([]);
  });
});

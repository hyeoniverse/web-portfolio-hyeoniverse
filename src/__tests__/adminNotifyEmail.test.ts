/**
 * 관리자 알림 메일 — 어떤 알림을 메일로 보내는가(lib/adminNotify.shouldEmail).
 *
 * 예전에는 종류와 상관없이 전부 보내서 설정 저장 · AI 실패마다 메일이 왔다. 지금은
 *   1) 전체 스위치(commentEmailNotify)가 꺼져 있으면 아무것도 안 보낸다
 *   2) 설정에서 고른 종류(notifyEmailTypes)만 보낸다 — 비어 있으면 기본 "중요한 것만"
 *   3) 잇따라 생기는 운영 알림(ai_failure 등)은 같은 종류 · 제목이 한 시간 안에 있으면 건너뛴다
 *   4) 댓글 · 신고 · 권한 요청처럼 건마다 다른 일은 DB 를 묻지 않고 매번 보낸다
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const cfg = { current: {} as Record<string, unknown> };
const recent = { rows: [] as { id: string }[], queried: 0 };

vi.mock("@/lib/getSiteConfig", () => ({ getSiteConfig: async () => cfg.current }));
vi.mock("@/lib/mail/log", () => ({ logMail: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      recent.queried += 1;
      const q = {
        select: () => q,
        eq: () => q,
        gte: () => q,
        limit: async () => ({ data: recent.rows }),
      };
      return q;
    },
  }),
}));

import { shouldEmail } from "@/lib/adminNotify";

describe("shouldEmail — 알림 메일 종류 · 중복", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test";
    cfg.current = { commentEmailNotify: true };
    recent.rows = [];
    recent.queried = 0;
  });

  it("전체 스위치가 꺼져 있으면 보내지 않는다", async () => {
    cfg.current = { commentEmailNotify: false };
    expect(await shouldEmail({ type: "comment", title: "새 댓글" })).toBe(false);
  });

  it("종류를 고르지 않았으면 기본(중요한 것만) — 댓글은 보내고 설정 변경 · 좋아요는 안 보낸다", async () => {
    expect(await shouldEmail({ type: "comment", title: "새 댓글" })).toBe(true);
    expect(await shouldEmail({ type: "config_changed", title: "사이트 설정 변경" })).toBe(false);
    expect(await shouldEmail({ type: "like", title: "좋아요" })).toBe(false);
  });

  it("설정에서 고른 종류만 보낸다", async () => {
    cfg.current = { commentEmailNotify: true, notifyEmailTypes: ["ai_failure"] };
    expect(await shouldEmail({ type: "comment", title: "새 댓글" })).toBe(false);
    expect(await shouldEmail({ type: "ai_failure", title: "AI 요약 chain 전부 실패" })).toBe(true);
  });

  it("운영 알림은 같은 종류 · 제목이 한 시간 안에 있으면 건너뛴다", async () => {
    cfg.current = { commentEmailNotify: true, notifyEmailTypes: ["ai_failure"] };
    recent.rows = [{ id: "n1" }];
    expect(await shouldEmail({ type: "ai_failure", title: "AI 요약 chain 전부 실패" })).toBe(false);
    expect(recent.queried).toBe(1);
  });

  it("댓글 · 신고 · 권한 요청은 DB 를 묻지 않고 매번 보낸다", async () => {
    cfg.current = { commentEmailNotify: true, notifyEmailTypes: ["comment", "report", "access_request"] };
    recent.rows = [{ id: "n1" }];
    expect(await shouldEmail({ type: "report", title: "댓글 신고" })).toBe(true);
    expect(await shouldEmail({ type: "access_request", title: "권한 요청" })).toBe(true);
    expect(recent.queried).toBe(0);
  });
});

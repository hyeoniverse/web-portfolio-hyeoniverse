// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

/* 문의 폼 서버 중계(/api/contact · /api/contact/upload) — 입력 확인 · reCAPTCHA 서버 검증 · 첨부 티켓 · 공급자 전달.
   Google · 공급자 · 저장소에는 닿지 않는다(fetch · 저장소 흉내) */

const state = {
  cfg: { recaptcha: { enabled: true, version: "v3" }, emailService: { provider: "formspree", enableFileUpload: true }, media: { limits: { pdf: 5 } } } as Record<string, unknown>,
  secrets: { RECAPTCHA_SECRET_KEY: "secret", NEXT_PUBLIC_FORMSPREE_ID: "abc" } as Record<string, string>,
  google: { success: true, score: 0.9, action: "contact_form" } as Record<string, unknown>,
  formspreeOk: true,
  calls: [] as { url: string; body?: FormData | URLSearchParams }[],
};

vi.mock("@/lib/getSiteConfig", () => ({ getSiteConfig: async () => state.cfg }));
vi.mock("@/lib/getSecret", () => ({ getSecret: async (k: string) => state.secrets[k] ?? "" }));
vi.mock("@/lib/serviceLog", () => ({ logService: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: async (path: string) => ({ data: { path, token: "upload-token" }, error: null }),
        createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://files.example/${path}?sig=1` }, error: null }),
      }),
    },
  }),
}));

process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";

vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
  state.calls.push({ url: String(url), body: init?.body as FormData | URLSearchParams });
  if (String(url).includes("recaptcha/api/siteverify")) return Response.json(state.google);
  if (String(url).includes("formspree.io")) return state.formspreeOk ? Response.json({ ok: true }) : Response.json({ errors: [{ message: "nope" }] }, { status: 422 });
  throw new Error(`unexpected fetch ${url}`);
});

const { POST: contact } = await import("@/app/api/contact/route");
const { POST: upload } = await import("@/app/api/contact/upload/route");

let ipSeq = 0;
const req = (path: string, body: unknown) =>
  new Request(`http://local${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ipSeq % 250}` },
    body: JSON.stringify(body),
  });
const valid = { name: "현", email: "a@example.com", title: "", message: "안녕하세요", recaptchaToken: "tok" };

beforeEach(() => {
  state.cfg = { recaptcha: { enabled: true, version: "v3" }, emailService: { provider: "formspree", enableFileUpload: true }, media: { limits: { pdf: 5 } } };
  state.secrets = { RECAPTCHA_SECRET_KEY: "secret", NEXT_PUBLIC_FORMSPREE_ID: "abc" };
  state.google = { success: true, score: 0.9, action: "contact_form" };
  state.formspreeOk = true;
  state.calls = [];
});

describe("/api/contact", () => {
  it("reCAPTCHA 를 서버가 확인한 뒤 공급자로 보낸다", async () => {
    const res = await contact(req("/api/contact", valid));
    expect(await res.json()).toEqual({ ok: true });
    expect(state.calls.map((c) => new URL(c.url).hostname)).toEqual(["www.google.com", "formspree.io"]);
  });

  it("reCAPTCHA 가 실패하거나 점수가 낮거나 action 이 다르면 보내지 않는다", async () => {
    for (const google of [{ success: false }, { success: true, score: 0.1, action: "contact_form" }, { success: true, score: 0.9, action: "other" }]) {
      state.google = google;
      state.calls = [];
      const res = await contact(req("/api/contact", valid));
      expect(res.status).toBe(403);
      expect((await res.json()).reason).toBe("captcha");
      expect(state.calls.some((c) => c.url.includes("formspree"))).toBe(false);
    }
  });

  it("비밀 키가 없으면 보내지 않고 설정 문제로 알린다(fail-closed)", async () => {
    state.secrets = { NEXT_PUBLIC_FORMSPREE_ID: "abc" };
    const res = await contact(req("/api/contact", valid));
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toBe("not_configured");
  });

  it("reCAPTCHA 를 끈 설정이면 확인 없이 보낸다", async () => {
    state.cfg = { ...state.cfg, recaptcha: { enabled: false, version: "v3" } };
    const res = await contact(req("/api/contact", { ...valid, recaptchaToken: undefined }));
    expect(await res.json()).toEqual({ ok: true });
    expect(state.calls.some((c) => c.url.includes("siteverify"))).toBe(false);
  });

  it("빈 칸 · 잘못된 메일 · 너무 긴 본문은 받지 않는다", async () => {
    for (const body of [{ ...valid, name: "" }, { ...valid, email: "nope" }, { ...valid, message: "x".repeat(5001) }]) {
      const res = await contact(req("/api/contact", body));
      expect(res.status).toBe(400);
    }
  });

  it("공급자가 거절하면 rejected 로 알린다", async () => {
    state.formspreeOk = false;
    const res = await contact(req("/api/contact", valid));
    expect(res.status).toBe(502);
    expect((await res.json()).reason).toBe("rejected");
  });
});

describe("/api/contact/upload → /api/contact 첨부", () => {
  it("업로드에서 확인한 reCAPTCHA 티켓으로 보내기를 통과하고, 본문에 내려받기 링크를 붙인다", async () => {
    const up = await (await upload(req("/api/contact/upload", { fileName: "cv.pdf", size: 1000, recaptchaToken: "tok" }))).json();
    expect(up.ok).toBe(true);
    expect(up.ticket).toBeTruthy();
    state.calls = [];
    const res = await contact(req("/api/contact", { ...valid, recaptchaToken: undefined, attachment: { path: up.path, name: "cv.pdf", ticket: up.ticket } }));
    expect(await res.json()).toEqual({ ok: true });
    expect(state.calls.some((c) => c.url.includes("siteverify"))).toBe(false);
    const sent = state.calls.find((c) => c.url.includes("formspree"))?.body as FormData;
    expect(String(sent.get("message"))).toContain(`https://files.example/${up.path}`);
  });

  it("다른 경로에 쓴 티켓은 통하지 않는다", async () => {
    const up = await (await upload(req("/api/contact/upload", { fileName: "cv.pdf", size: 1000, recaptchaToken: "tok" }))).json();
    const other = "00000000-0000-4000-8000-000000000000/other.pdf";
    state.google = { success: false };
    const res = await contact(req("/api/contact", { ...valid, recaptchaToken: undefined, attachment: { path: other, name: "x.pdf", ticket: up.ticket } }));
    expect(res.status).toBe(403);
  });

  it("첨부를 끈 설정 · 막힌 형식 · 너무 큰 파일은 서명 URL 을 주지 않는다", async () => {
    expect((await (await upload(req("/api/contact/upload", { fileName: "a.exe", size: 10, recaptchaToken: "tok" }))).json()).reason).toBe("type");
    expect((await (await upload(req("/api/contact/upload", { fileName: "a.pdf", size: 6 * 1024 * 1024, recaptchaToken: "tok" }))).json()).reason).toBe("too_large");
    state.cfg = { ...state.cfg, emailService: { provider: "formspree", enableFileUpload: false } };
    expect((await (await upload(req("/api/contact/upload", { fileName: "a.pdf", size: 10, recaptchaToken: "tok" }))).json()).reason).toBe("disabled");
  });
});

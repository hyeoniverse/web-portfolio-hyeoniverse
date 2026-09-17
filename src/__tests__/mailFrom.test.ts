// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";

/* 발신 주소는 SITE_URL 에서 끌어온다 — 도메인을 옮길 때 고칠 곳이 한 군데여야 한다.
   모듈을 불러올 때 한 번 계산하므로 값마다 다시 불러온다. */
const mailFrom = async (siteUrl: string) => {
  vi.resetModules();
  vi.stubEnv("SITE_URL", siteUrl);
  const { MAIL_FROM } = await import("@/constants/mail");
  return MAIL_FROM;
};

afterEach(() => vi.unstubAllEnvs());

describe("MAIL_FROM", () => {
  it("SITE_URL 의 도메인으로 보낸다 — www 는 뗀다(Resend 인증은 apex 에 건다)", async () => {
    expect(await mailFrom("https://www.hyeoniverse.com")).toBe("Hyeoniverse <noreply@hyeoniverse.com>");
    expect(await mailFrom("https://hyeoniverse.com")).toBe("Hyeoniverse <noreply@hyeoniverse.com>");
  });

  it("끝의 / 나 경로가 붙어 있어도 도메인만 쓴다", async () => {
    expect(await mailFrom("https://www.hyeoniverse.com/")).toBe("Hyeoniverse <noreply@hyeoniverse.com>");
    expect(await mailFrom("https://hyeoniverse.com/admin")).toBe("Hyeoniverse <noreply@hyeoniverse.com>");
  });

  it("SITE_URL 이 비었거나 주소로 해석되지 않으면 Resend 임시 주소로 떨어진다", async () => {
    for (const siteUrl of ["", "hyeoniverse.com"]) {
      expect(await mailFrom(siteUrl), siteUrl || "(빈 값)").toBe("Portfolio <onboarding@resend.dev>");
    }
  });
});

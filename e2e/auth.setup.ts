import { test as setup, expect } from "@playwright/test";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * admin 시각 회귀용 로그인 세션 확보.
 *
 * 로그인에는 보안 게이트가 두 겹 있다:
 *   1) Supabase 이메일/비밀번호 → aal1 세션
 *   2) 2단계 인증(OTP 앱) — aal1 세션은 관리 화면 대신 /admin/mfa 로 간다(src/lib/auth/mfa.ts)
 *
 * 2번은 인증 앱의 비밀 키로 코드를 직접 계산해 넣는다. 이후에는 여기서 저장한 storageState 를 재사용한다.
 *
 * 절차:
 *   1. .env.local 에 E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD 추가
 *      → 소유자(OWNER_EMAIL) 계정을 쓰는 것을 권한다. 새로 만든 계정은 app_metadata 가
 *        비어 있어 role 이 없고(getUserRole → level 0) admin 접근이 거부된다.
 *   2. 설정 › 계정 › 인증 앱 추가 로 e2e 전용 인증 앱을 하나 더 등록하고, QR 아래의 키를 E2E_TOTP_SECRET 에 넣는다
 *      (그 키를 아는 것 = 그 인증 앱을 가진 것이다. .env.local 밖으로 내보내지 않는다. 쓰지 않게 되면 설정에서 그 앱을 지운다)
 *   3. npm run test:smoke:admin → 통과, 세션이 저장된다
 *
 * 저장 파일에는 인증 토큰이 들어 있다. .gitignore 에 있으며 절대 커밋하지 않는다.
 */

export const ADMIN_STATE = path.join(__dirname, ".auth/admin.json");

/** RFC 4648 base32 → 바이트(인증 앱에 넣는 키 형식) */
function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.toUpperCase().replace(/[\s=]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) throw new Error("E2E_TOTP_SECRET 이 base32 키가 아닙니다");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** RFC 6238 TOTP — 30초 창, 6자리, HMAC-SHA1(인증 앱 기본값) */
function totp(secret: Buffer, now = Date.now()): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const h = createHmac("sha1", secret).update(msg).digest();
  const offset = h[h.length - 1] & 0x0f;
  return ((h.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

setup("authenticate admin", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  const totpSecret = process.env.E2E_TOTP_SECRET;

  if (!email || !password) {
    throw new Error(
      "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD 가 없습니다. .env.local 에 추가한 뒤 다시 실행해 주세요.\n" +
        "소유자(OWNER_EMAIL) 계정을 쓰는 것을 권합니다 — 새로 만든 계정은 role 이 없어 admin 접근이 거부됩니다.",
    );
  }

  await page.goto("/admin/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // 성공하면 admin 영역으로 간다 — 2단계 인증이 켜져 있으면 /admin/mfa 로 먼저
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 20_000 }).catch(() => {
    /* 아래에서 원인별로 안내 */
  });

  if (new URL(page.url()).pathname === "/admin/mfa") {
    if (!totpSecret) {
      throw new Error(
        "2단계 인증 단계입니다. 설정 › 계정 › 인증 앱 추가 로 e2e 전용 인증 앱을 등록하고,\n" +
          "QR 아래의 키를 .env.local 의 E2E_TOTP_SECRET 에 넣은 뒤 다시 실행해 주세요.",
      );
    }
    const code = page.locator("#mfa-code");
    await code.waitFor();
    await code.fill(totp(base32Decode(totpSecret)));
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => url.pathname !== "/admin/mfa", { timeout: 20_000 });
  }

  /* 성공 판정은 URL 이 아니라 "보호된 페이지에 들어가지는가" 로 한다.
     로그인 API 가 200 을 주고 화면이 admin 으로 바뀌어도 주소는 /admin/login 그대로일 수 있어
     (라우팅 없이 화면만 교체되는 경우), URL 단언은 멀쩡한 세션을 실패로 만든다. */
  await page.goto("/admin/posts");
  await expect(page, "세션이 유효하면 보호된 페이지에 머문다").not.toHaveURL(/\/admin\/(login|mfa)/);

  fs.mkdirSync(path.dirname(ADMIN_STATE), { recursive: true });
  await page.context().storageState({ path: ADMIN_STATE });
});

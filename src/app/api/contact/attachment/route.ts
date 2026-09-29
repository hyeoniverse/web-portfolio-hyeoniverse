import { createHash } from "node:crypto";
import { requireOwner } from "@/lib/api/requireRole";
import { jsonOk } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { logService } from "@/lib/serviceLog";

/**
 * 문의 폼 파일 첨부의 상태 — 설정 › 서비스 › 이메일 서비스의 "파일 업로드"가 켜져 있어도, 첨부를 단 메일이
 * 여러 번 이어 실패하면 첨부만 저절로 끈다(메일은 계속 보낼 수 있다).
 *
 * 문의 폼은 방문자 브라우저가 Formspree 로 바로 보내서 서버가 결과를 모른다. 그래서 폼이 첨부를 단 전송의
 * 결과를 여기로 알린다. 공개 경로라 아무나 실패를 알릴 수 있으므로 같은 IP 의 실패는 10분에 한 번만 센다
 * (한 곳에서 몰아 보내 첨부를 끄려면 FAIL_LIMIT × 10분이 걸린다). 꺼지면 관리자에게 알린다.
 *
 * GET    — 폼이 첨부 단추를 보일지({ enabled })
 * POST   { ok, reason? } — 첨부를 단 전송의 결과. 성공하면 이어진 실패를 지운다
 * DELETE — 관리자가 다시 켠다(owner)
 */

const ROW = "contact_attachment";
const FAIL_LIMIT = 3;
const IP_WINDOW_MS = 10 * 60 * 1000;

export interface AttachmentHealth {
  fails: number;
  reason?: string;
  at?: string;
  /** IP 해시 → 마지막으로 센 때(ms) */
  seen?: Record<string, number>;
  disabled?: { at: string; reason?: string };
}

async function read(): Promise<AttachmentHealth> {
  const { data } = await createAdminClient().from("site_settings").select("config").eq("id", ROW).maybeSingle();
  return ((data?.config as AttachmentHealth | null) ?? { fails: 0 });
}

async function write(config: AttachmentHealth): Promise<void> {
  await createAdminClient().from("site_settings").upsert({ id: ROW, config, updated_at: new Date().toISOString() });
}

export async function GET() {
  const [config, health] = await Promise.all([getSiteConfig(), read().catch(() => ({ fails: 0 }) as AttachmentHealth)]);
  const on = !!config?.emailService?.enableFileUpload;
  return jsonOk({
    enabled: on && !health.disabled,
    /* 설정 화면용 — 방문자에게는 켜짐 여부만 의미가 있다 */
    fails: health.fails,
    disabled: health.disabled ?? null,
    reason: health.reason ?? null,
    at: health.at ?? null,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { ok?: unknown; reason?: unknown };
  const health = await read();

  if (body.ok === true) {
    await logService({ category: "contact", provider: "contact-attachment", ok: true });
    if (health.fails > 0 && !health.disabled) await write({ ...health, fails: 0 });
    return jsonOk({ enabled: !health.disabled });
  }

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const key = createHash("sha256").update(ip).digest("hex").slice(0, 16);
  const now = Date.now();
  /* 오래된 IP 기록은 지운다 — 줄이 끝없이 늘지 않게 */
  const seen = Object.fromEntries(Object.entries(health.seen ?? {}).filter(([, t]) => now - t < IP_WINDOW_MS));
  if (seen[key] || health.disabled) return jsonOk({ enabled: !health.disabled });
  seen[key] = now;

  const reason = typeof body.reason === "string" ? body.reason.slice(0, 200) : undefined;
  /* 센 실패만 기록한다(같은 IP 10분 안의 되풀이는 위에서 걸렀다) */
  await logService({ category: "contact", provider: "contact-attachment", ok: false, kind: "unknown", message: reason });
  const fails = health.fails + 1;
  const next: AttachmentHealth = { ...health, fails, reason, at: new Date().toISOString(), seen };
  if (fails >= FAIL_LIMIT) {
    next.disabled = { at: next.at!, reason };
    try {
      const { notifyAdmin } = await import("@/lib/adminNotify");
      await notifyAdmin({
        type: "ai_failure",
        title: "문의 폼 파일 첨부를 껐습니다",
        message: `첨부를 단 메일이 ${fails}번 이어 실패해 첨부만 껐습니다(메일은 계속 받습니다). 설정 › 서비스 › 이메일 서비스에서 원인을 확인한 뒤 다시 켜 주세요.${reason ? ` 마지막 원인: ${reason}` : ""}`,
        metadata: { fails, reason },
      });
    } catch { /* 알림 실패는 삼킨다 */ }
  }
  await write(next);
  return jsonOk({ enabled: !next.disabled });
}

export async function DELETE() {
  const { error } = await requireOwner();
  if (error) return error;
  await write({ fails: 0 });
  return jsonOk({ enabled: true });
}

export const dynamic = "force-dynamic";
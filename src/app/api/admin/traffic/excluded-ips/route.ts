import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { getIp } from "@/utils/getIp";
import { invalidateExcludedIps, ipKey, maskIp } from "@/lib/api/ipAnalytics";
import type { SupabaseClient } from "@supabase/supabase-js";

/* '내 IP' 지정(#1169) — 클라는 원문 IP 를 모른다. 불투명 키(ipKey)나 "지금 접속한 IP" 로 요청하면
   서버가 원문을 찾아 traffic_excluded_ips 에 넣고 뺀다. */

type Body = { key?: unknown; current?: unknown };

async function readBody(request: Request): Promise<Body> {
  try {
    return (await request.json()) as Body;
  } catch {
    return {};
  }
}

/** 키 → 원문 IP. 후보는 익명화 전(최근 90일) 방문 IP 와 이미 제외된 IP 뿐이다 */
async function resolveKey(admin: SupabaseClient, key: string): Promise<string | null> {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const [visits, excluded] = await Promise.all([
    admin.from("site_visits").select("ip").gte("date", since.toISOString().slice(0, 10)),
    admin.from("traffic_excluded_ips").select("ip"),
  ]);
  const candidates = new Set<string>([
    ...((visits.data ?? []) as Array<{ ip: string }>).map((r) => r.ip),
    ...((excluded.data ?? []) as Array<{ ip: string }>).map((r) => r.ip),
  ]);
  for (const ip of candidates) {
    if (maskIp(ip) && ipKey(ip) === key) return ip;
  }
  return null;
}

async function resolveTarget(admin: SupabaseClient, request: Request, body: Body): Promise<string | null> {
  if (body.current === true) {
    const ip = getIp(request);
    return maskIp(ip) ? ip : null;
  }
  if (typeof body.key === "string" && /^[0-9a-f]{16}$/.test(body.key)) {
    return resolveKey(admin, body.key);
  }
  return null;
}

// POST /api/admin/traffic/excluded-ips — { key } 또는 { current: true }
export async function POST(request: Request) {
  const { error: authError } = await requireRole(PERM.ADMIN);
  if (authError) return authError;

  const admin = createAdminClient();
  const ip = await resolveTarget(admin, request, await readBody(request));
  if (!ip) return jsonError("IP 를 찾을 수 없습니다.", 404);

  const { error } = await admin
    .from("traffic_excluded_ips")
    .upsert({ ip }, { onConflict: "ip", ignoreDuplicates: true });
  if (error) return jsonServerError(error, "POST /api/admin/traffic/excluded-ips");

  invalidateExcludedIps();
  return jsonOk({ key: ipKey(ip), masked: maskIp(ip) });
}

// DELETE /api/admin/traffic/excluded-ips — { key } 또는 { current: true }
export async function DELETE(request: Request) {
  const { error: authError } = await requireRole(PERM.ADMIN);
  if (authError) return authError;

  const admin = createAdminClient();
  const ip = await resolveTarget(admin, request, await readBody(request));
  if (!ip) return jsonError("IP 를 찾을 수 없습니다.", 404);

  const { error } = await admin.from("traffic_excluded_ips").delete().eq("ip", ip);
  if (error) return jsonServerError(error, "DELETE /api/admin/traffic/excluded-ips");

  invalidateExcludedIps();
  return jsonOk({ key: ipKey(ip) });
}

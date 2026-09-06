import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonServerError } from "@/lib/api/response";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { deviceKey } from "@/lib/auth/uaParser";

/** GET /api/admin/auth/devices
 *  현재 admin user 의 등록된 기기 목록 — browser+OS+device 단위로 dedup.
 *  Legacy raw-UA hash row 가 같은 기기로 여러 개 있어도 한 entry 로 묶임. */
export async function GET() {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const h = await headers();
  const currentKey = deviceKey(h.get("user-agent") ?? "");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_known_devices")
    .select("id, fingerprint, user_agent, ip_address, approved, first_seen_at, last_seen_at")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false });

  if (error) return jsonServerError(error, "GET /api/admin/auth/devices");

  // browser+OS+device key 로 그룹화 — 가장 최근 last_seen 의 row 를 대표로,
  // first_seen 은 그룹 내 최오래, ids 는 같이 묶인 모든 row id (DELETE 시 한 번에 제거).
  const groups = new Map<string, {
    rep: typeof data[number];
    ids: string[];
    firstSeen: string;
    lastSeen: string;
    isCurrent: boolean;
    approved: boolean;
  }>();
  for (const row of data ?? []) {
    const key = deviceKey(row.user_agent ?? "");
    const g = groups.get(key);
    if (!g) {
      groups.set(key, {
        rep: row,
        ids: [row.id],
        firstSeen: row.first_seen_at,
        lastSeen: row.last_seen_at,
        isCurrent: key === currentKey,
        approved: row.approved,
      });
    } else {
      g.ids.push(row.id);
      if (row.first_seen_at < g.firstSeen) g.firstSeen = row.first_seen_at;
      if (row.last_seen_at > g.lastSeen) { g.lastSeen = row.last_seen_at; g.rep = row; }
      if (row.approved) g.approved = true;
    }
  }

  const devices = Array.from(groups.values())
    .sort((a, b) => (b.lastSeen > a.lastSeen ? 1 : -1))
    .map((g) => ({
      id: g.rep.id,
      ids: g.ids,
      fingerprint: g.rep.fingerprint,
      user_agent: g.rep.user_agent,
      ip_address: g.rep.ip_address,
      approved: g.approved,
      first_seen_at: g.firstSeen,
      last_seen_at: g.lastSeen,
      isCurrent: g.isCurrent,
    }));

  return NextResponse.json({ devices });
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fingerprintFromUA } from "@/lib/auth/knownDevices";

/** GET /api/admin/auth/devices
 *  현재 admin user 의 등록된 기기 목록.
 *  각 row 의 isCurrent 는 요청 헤더 UA fingerprint 와 일치 여부로 판단. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  const currentFp = fingerprintFromUA(userAgent);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_known_devices")
    .select("id, fingerprint, user_agent, ip_address, approved, first_seen_at, last_seen_at")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const devices = (data ?? []).map((d) => ({
    ...d,
    isCurrent: d.fingerprint === currentFp,
  }));

  return NextResponse.json({ devices });
}

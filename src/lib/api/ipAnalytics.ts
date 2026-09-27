import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/* IP 분석(#1169) — 원문 IP 는 서버 밖으로 내보내지 않는다.
   화면에는 마스킹 값을, 행 식별에는 HMAC 키를 쓴다. 키로 '내 IP' 를 지정하면 서버가 원문을 되찾는다. */

/** 211.234.10.7 → 211.234.x.x / 2001:db8:85a3::7 → 2001:db8:x:x. 익명화됐거나 알 수 없으면 null */
export function maskIp(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown" || ip.startsWith("anon:") || ip.startsWith("bot:")) return null;
  // IPv4-mapped IPv6(::ffff:1.2.3.4) 는 IPv4 로 본다 — 그대로 그룹을 자르면 IPv4 원문이 남는다
  const addr = ip.replace(/^::ffff:/i, "");
  const v4 = addr.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (v4) return `${v4[1]}.${v4[2]}.x.x`;
  // 점이 섞인 나머지 형태는 어디까지가 IPv4 인지 가를 수 없어 보이지 않는다
  if (addr.includes(".")) return null;
  if (addr.includes(":")) {
    const groups = addr.split(":").filter(Boolean);
    if (groups.length >= 2) return `${groups[0]}:${groups[1]}:x:x`;
  }
  return null;
}

/* 비밀값은 서버에만 있는 service role key 를 빌린다. 키가 바뀌면 키 값도 바뀌지만
   제외 목록은 원문 IP 로 저장하므로 영향이 없다 */
const IP_KEY_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** 원문 IP → 응답에 실어도 되는 불투명 키 (역산 불가, 같은 IP 는 같은 키) */
export function ipKey(ip: string): string {
  return createHmac("sha256", IP_KEY_SECRET).update(ip).digest("hex").slice(0, 16);
}

export type IpVisitRow = {
  ip: string | null;
  date: string | null;
  country?: string | null;
  device_kind?: string | null;
  os?: string | null;
  browser?: string | null;
};

export type IpVisitor = {
  key: string;
  masked: string;
  /** 기간 내 방문한 날 수 — site_visits 는 IP 하루 1행 */
  days: number;
  firstDate: string;
  lastDate: string;
  country: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
};

/** IP 별 방문 — 방문 일수 많은 순, 같으면 최근 방문 순. 익명화·봇·알 수 없는 IP 는 뺀다 */
export function aggregateIpVisitors(rows: IpVisitRow[], limit = 20): IpVisitor[] {
  const byIp = new Map<string, { rows: IpVisitRow[]; masked: string }>();
  for (const r of rows) {
    if (!r.ip || !r.date) continue;
    const masked = maskIp(r.ip);
    if (!masked) continue;
    const entry = byIp.get(r.ip) ?? { rows: [], masked };
    entry.rows.push(r);
    byIp.set(r.ip, entry);
  }
  const visitors: IpVisitor[] = [];
  for (const [ip, { rows: list, masked }] of byIp) {
    const sorted = [...list].sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
    const latest = sorted[sorted.length - 1];
    visitors.push({
      key: ipKey(ip),
      masked,
      days: sorted.length,
      firstDate: sorted[0].date!,
      lastDate: latest.date!,
      country: latest.country ?? null,
      device: latest.device_kind ?? null,
      os: latest.os ?? null,
      browser: latest.browser ?? null,
    });
  }
  visitors.sort((a, b) => b.days - a.days || (a.lastDate < b.lastDate ? 1 : a.lastDate > b.lastDate ? -1 : 0));
  return visitors.slice(0, limit);
}

/* 제외 목록 — 방문마다 조회하지 않게 잠깐 캐시한다. 추가·삭제 API 는 invalidate 를 부른다 */
const CACHE_MS = 60_000;
let cache: { at: number; ips: Set<string> } | null = null;

/** '내 IP' 로 지정된 원문 IP 집합. 마이그레이션 전(테이블 없음)이면 빈 집합 */
export async function loadExcludedIps(admin: SupabaseClient, { fresh = false } = {}): Promise<Set<string>> {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.ips;
  const { data, error } = await admin.from("traffic_excluded_ips").select("ip");
  const ips = new Set<string>(error ? [] : ((data ?? []) as Array<{ ip: string }>).map((r) => r.ip));
  cache = { at: Date.now(), ips };
  return ips;
}

export function invalidateExcludedIps() {
  cache = null;
}

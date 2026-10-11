import { createHmac } from "node:crypto";
import { getIp } from "@/utils/getIp";

/**
 * 데모 상한을 세는 IP 키 — 원문 IP 는 DB 에 넣지 않는다.
 *
 * 비밀값은 DEMO_IP_SALT, 없으면 서버에만 있는 service role key 를 빌린다(lib/api/ipAnalytics 와 같은 방식).
 * 앞에 "demo:" 를 붙여 IP 분석의 키(ipKey)와 같은 값이 나오지 않게 한다 — 두 표를 이어 볼 수 없게.
 * 비밀값이 바뀌면 그날 센 횟수가 처음부터 다시 세어질 뿐이다.
 */
export function hashDemoIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(`demo:${ip}`).digest("hex").slice(0, 32);
}

export function demoIpHash(request: Request): string {
  const secret = process.env.DEMO_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  /* Vercel 은 x-forwarded-for 를 스스로 채워 덮으므로 방문자가 바꿔 보낼 수 없다. 못 읽으면 "unknown" 하나로 센다 */
  return hashDemoIp(getIp(request), secret);
}

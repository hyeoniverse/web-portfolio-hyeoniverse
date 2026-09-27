import { describe, it, expect } from "vitest";
import { maskIp, ipKey, aggregateIpVisitors } from "@/lib/api/ipAnalytics";

describe("maskIp", () => {
  it("IPv4 는 앞 두 자리만 남긴다", () => {
    expect(maskIp("211.234.10.7")).toBe("211.234.x.x");
  });

  it("IPv6 는 앞 두 그룹만 남긴다", () => {
    expect(maskIp("2001:db8:85a3::8a2e:370:7334")).toBe("2001:db8:x:x");
  });

  it("IPv4-mapped IPv6 는 IPv4 로 마스킹해 원문이 남지 않는다", () => {
    expect(maskIp("::ffff:127.0.0.1")).toBe("127.0.x.x");
    expect(maskIp("::FFFF:211.234.10.7")).toBe("211.234.x.x");
    expect(maskIp("64:ff9b::1.2.3.4")).toBeNull();
  });

  it("익명화·봇·알 수 없는 값은 null", () => {
    expect(maskIp("anon:0b2e")).toBeNull();
    expect(maskIp("bot:1.2.3.4")).toBeNull();
    expect(maskIp("unknown")).toBeNull();
    expect(maskIp("")).toBeNull();
    expect(maskIp(null)).toBeNull();
  });
});

describe("ipKey", () => {
  it("같은 IP 는 같은 키, 다른 IP 는 다른 키이고 원문을 담지 않는다", () => {
    const a = ipKey("211.234.10.7");
    expect(a).toBe(ipKey("211.234.10.7"));
    expect(a).not.toBe(ipKey("211.234.10.8"));
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(a).not.toContain("211");
  });
});

describe("aggregateIpVisitors", () => {
  const rows = [
    { ip: "1.1.1.1", date: "2026-09-01", country: "KR", device_kind: "desktop", os: "macOS", browser: "Chrome" },
    { ip: "1.1.1.1", date: "2026-09-03", country: "KR", device_kind: "mobile", os: "iOS", browser: "Safari" },
    { ip: "1.1.1.1", date: "2026-09-02", country: "KR", device_kind: "desktop", os: "macOS", browser: "Chrome" },
    { ip: "2.2.2.2", date: "2026-09-05", country: "US", device_kind: "desktop", os: "Windows", browser: "Edge" },
    { ip: "3.3.3.3", date: "2026-09-04", country: "JP", device_kind: "mobile", os: "Android", browser: "Chrome" },
    { ip: "anon:x", date: "2026-09-05", country: "KR", device_kind: "desktop", os: "macOS", browser: "Chrome" },
  ];

  it("방문 일수 순, 같으면 최근 방문 순으로 정렬하고 익명화 행은 뺀다", () => {
    const v = aggregateIpVisitors(rows);
    expect(v.map((x) => x.masked)).toEqual(["1.1.x.x", "2.2.x.x", "3.3.x.x"]);
    expect(v[0].days).toBe(3);
  });

  it("첫/최근 방문과 최근 방문 기준 기기 정보를 담는다", () => {
    const [top] = aggregateIpVisitors(rows);
    expect(top.firstDate).toBe("2026-09-01");
    expect(top.lastDate).toBe("2026-09-03");
    expect(top.device).toBe("mobile");
    expect(top.browser).toBe("Safari");
    expect(top.key).toBe(ipKey("1.1.1.1"));
  });

  it("limit 만큼만 돌려준다", () => {
    expect(aggregateIpVisitors(rows, 2)).toHaveLength(2);
  });
});

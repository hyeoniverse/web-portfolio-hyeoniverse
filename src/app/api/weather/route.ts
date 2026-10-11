import { NextResponse, type NextRequest } from "next/server";
import { minutesOf, weatherKindOf, type VisitorWeather } from "@/lib/weather/sky";

/**
 * GET /api/weather — 방문자 위치의 지금 날씨(About 하늘 배경 · 첫 화면 날씨 줄).
 *
 * 위치는 배포 환경(Vercel)이 요청마다 붙여 주는 IP 위치 헤더로 안다 — 위치 권한을 묻지 않는다. 도시 단위라 정확하지 않다.
 * 헤더가 없으면(로컬 개발 · 다른 호스팅) 서울로 대신한다.
 * 날씨는 Open-Meteo(키 없음)에서 받는다. 좌표는 소수 첫째 자리(약 10km)로 줄여서 보내고, 같은 칸은 15분 동안 다시 묻지 않는다.
 * 실패하면 맑음으로 둔다 — 하늘은 날씨 없이도 그려진다.
 */

const SEOUL = { lat: 37.57, lon: 126.98, city: "Seoul" };
const REVALIDATE_S = 900;

export async function GET(request: NextRequest) {
  const h = request.headers;
  const lat = Number(h.get("x-vercel-ip-latitude"));
  const lon = Number(h.get("x-vercel-ip-longitude"));
  const known = Number.isFinite(lat) && Number.isFinite(lon) && h.get("x-vercel-ip-latitude") !== null;
  const cityRaw = h.get("x-vercel-ip-city");
  let city: string | null = SEOUL.city;
  if (known) {
    try {
      city = cityRaw ? decodeURIComponent(cityRaw) : null;
    } catch {
      city = cityRaw;
    }
  }
  const qLat = (known ? lat : SEOUL.lat).toFixed(1);
  const qLon = (known ? lon : SEOUL.lon).toFixed(1);

  const body: VisitorWeather = { city, fallback: !known, lat: Number(qLat), lon: Number(qLon), temp: null, kind: "clear", sunrise: null, sunset: null };
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${qLat}&longitude=${qLon}` +
      "&current=temperature_2m,weather_code&daily=sunrise,sunset&forecast_days=1&timezone=auto";
    const res = await fetch(url, { next: { revalidate: REVALIDATE_S }, signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = (await res.json()) as {
        current?: { temperature_2m?: number; weather_code?: number };
        daily?: { sunrise?: string[]; sunset?: string[] };
      };
      const t = data.current?.temperature_2m;
      body.temp = typeof t === "number" ? Math.round(t) : null;
      body.kind = weatherKindOf(data.current?.weather_code);
      body.sunrise = minutesOf(data.daily?.sunrise?.[0]);
      body.sunset = minutesOf(data.daily?.sunset?.[0]);
    }
  } catch {
    /* 날씨 없이 그린다 */
  }
  /* 방문자마다 위치가 다르다 — 공유 캐시에 두지 않는다 */
  return NextResponse.json(body, { headers: { "Cache-Control": "private, max-age=600" } });
}

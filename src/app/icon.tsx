import { ImageResponse } from "next/og";
import { getSiteConfig } from "@/lib/getSiteConfig";

/** 다이내믹 favicon — siteConfig.brand.logoText + logoColor 기반.
 *  Next App Router 가 자동으로 <link rel="icon"> 주입. 관리자가 색상 변경 시 차후 응답부터 반영. */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// 매 요청마다 fresh — siteConfig 변경이 즉시 favicon 에 반영되도록 (브라우저 캐시는 여전히 있음 → 강제 새로고침 권장)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Icon() {
  const config = await getSiteConfig().catch(() => null);
  const logoText = (config?.brand?.logoText ?? "H").trim() || "H";
  const logoColor = config?.brand?.logoColor || "#0a0a0a";
  const bgColor = config?.theme?.lightBg || "#ffffff";
  const shape = config?.brand?.faviconShape ?? "circle";
  const font = config?.brand?.faviconFont ?? "serif";
  // 로고 이미지 업로드되어 있으면 그 이미지를 favicon 으로 사용 (short 우선, 없으면 dark short)
  const logoUrl = config?.brand?.logoShortUrl || config?.brand?.logoShortDarkUrl || "";

  // shape 별 background / borderRadius. none = bg 투명 (배경 없음)
  const bg = shape === "none" ? "transparent" : bgColor;
  const borderRadius = shape === "circle" ? "50%" : shape === "square" ? "6px" : 0;

  // font family — ImageResponse default sans 외엔 별도 폰트 fetch 필요. 우선 generic family 매핑
  const fontFamily = font === "serif" ? "serif" : font === "mono" ? "monospace" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bg,
          color: logoColor,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          fontFamily,
          borderRadius,
          overflow: "hidden",
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            width={size.width}
            height={size.height}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          logoText.charAt(0)
        )}
      </div>
    ),
    {
      ...size,
      // 브라우저 캐시 최소화 — admin 색상 변경 시 강제 새로고침으로 즉시 확인 가능
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    },
  );
}

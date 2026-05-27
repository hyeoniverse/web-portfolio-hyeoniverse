import { ImageResponse } from "next/og";
import { getSiteConfig } from "@/lib/getSiteConfig";

/** 다이내믹 favicon — siteConfig.brand.logoText + logoColor 기반.
 *  Next App Router 가 자동으로 <link rel="icon"> 주입. 관리자가 색상 변경 시 차후 응답부터 반영. */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// 다른 인스턴스가 동시 fetch 해도 안전 — getSiteConfig 가 캐시 됨
export const revalidate = 60;

export default async function Icon() {
  const config = await getSiteConfig().catch(() => null);
  const logoText = (config?.brand?.logoText ?? "H").trim() || "H";
  const logoColor = config?.brand?.logoColor || "#0a0a0a";
  const bgColor = config?.theme?.lightBg || "#ffffff";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bgColor,
          color: logoColor,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.04em",
        }}
      >
        {logoText.charAt(0)}
      </div>
    ),
    { ...size },
  );
}

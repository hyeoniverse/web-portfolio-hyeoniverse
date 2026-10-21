import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/* 콘텐츠 보안 정책 — 지금은 관찰 모드(Report-Only)라 막지 않고 위반만 보고한다(/api/csp-report → 서버 로그).
   쓰는 외부 출처: Supabase(데이터 · 저장소 · 실시간), reCAPTCHA(문의), giscus(댓글), unpkg(본문 도구),
   Vercel(분석 · 미리보기 툴바), Google Fonts · jsDelivr(글꼴), YouTube · Vimeo(본문 영상), Office 뷰어(라이브러리 미리보기).
   본문 이미지는 외부 주소가 많아 https 전체를 연다. 위반이 잦아들면 Content-Security-Policy 로 바꾼다 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://giscus.app https://unpkg.com https://va.vercel-scripts.com https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com https://giscus.app",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google.com https://unpkg.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://vercel.live",
  "frame-src 'self' blob: https://www.google.com https://giscus.app https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://view.officeapps.live.com https://*.supabase.co https://vercel.live",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  // 위반 보고 — Safari 는 보고 주소가 없으면 관찰 모드 정책을 아예 쓰지 않는다. report-uri(Safari · Firefox) · report-to(Chrome) 둘 다
  "report-uri /api/csp-report",
  "report-to csp",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 마이크는 슬라이드 음성 녹음(lib/micRecorder)이 쓴다 — 이 사이트에서만
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()" },
  // 소개 페이지가 /works 를 iframe 으로 띄운다 — 같은 출처는 허용
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Reporting-Endpoints", value: 'csp="/api/csp-report"' },
  { key: "Content-Security-Policy-Report-Only", value: CSP },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  /* 글 링크를 블로그 주소(blog.hyeoniverse.com)로 그릴지 — 운영 배포에서 메인의 /posts 를 블로그로 보낼 때만(lib/siteHosts blogHref).
     로컬 · 프리뷰는 앱 경로 /posts 그대로 둔다. 빌드 때 값이 굳어 서버 · 브라우저가 같은 링크를 그린다 */
  env: {
    NEXT_PUBLIC_BLOG_LINKS:
      process.env.VERCEL_ENV === "production" && process.env.BLOG_SUBDOMAIN_REDIRECT === "1" ? "1" : "",
  },
  productionBrowserSourceMaps: true,
  /* 글 공유 카드(app/og/posts/[slug])가 런타임에 읽는 글꼴 — readFile 경로는 추적되지 않아 배포 묶음에 직접 넣는다(lib/og/postCard) */
  outputFileTracingIncludes: {
    "/og/posts/*": [
      "./node_modules/pretendard/dist/web/static/woff/Pretendard-Medium.woff",
      "./node_modules/pretendard/dist/web/static/woff/Pretendard-Bold.woff",
    ],
  },
  experimental: {
    inlineCss: false,
    optimizePackageImports: [
      "framer-motion",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "gsap",
      "lucide-react",
      "react-icons",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-code-block-lowlight",
      "@tiptap/extension-color",
      "@tiptap/extension-font-family",
      "@tiptap/extension-highlight",
      "@tiptap/extension-image",
      "@tiptap/extension-link",
      "@tiptap/extension-placeholder",
      "@tiptap/extension-text-style",
      "@tiptap/extension-youtube",
      "highlight.js",
      "marked",
      "prism-react-renderer",
      "@xyflow/react",
      "@platejs/basic-nodes",
      "@platejs/basic-styles",
      "@platejs/code-block",
      "@platejs/indent",
      "@platejs/layout",
      "@platejs/link",
      "@platejs/list",
      "@platejs/math",
      "@platejs/media",
      "@platejs/table",
      "katex",
    ],
  },
  turbopack: {
    rules: {
      "*.md": { loaders: ["./raw-text-loader.js"], as: "*.js" },
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });

    return config;
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      /* 저장소 README 에서 끌어온 표지(#1053). GitHub 이 이미지를 내주는 호스트들이다 —
         raw 파일, 첨부 이미지(user-images·user-attachments), 프록시(camo).
         여기 없는 호스트의 이미지는 lib/githubReadme 가 애초에 쓰지 않는다. 안 그러면
         낯선 주소 하나가 next/image 에서 걸려 홈 전체가 500 이 된다. */
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "user-images.githubusercontent.com" },
      { protocol: "https", hostname: "camo.githubusercontent.com" },
      { protocol: "https", hostname: "github.com" },
      /* README 에 그림이 없는 저장소를 작업물로 들일 때 대표 이미지로 쓰는 GitHub 저장소 소개 카드
         (lib/repoWorkDefaults 의 repoCoverFallback) */
      { protocol: "https", hostname: "opengraph.githubassets.com" },
    ],
  },
  /* 브라우저가 링크 없이 바로 찾는 아이콘 주소 — 사파리는 HTML 의 아이콘을 못 쓰면 /favicon.ico 를, 즐겨찾기 ·
     홈 화면은 /apple-touch-icon.png 를 찾는다. 없으면 사이트 이름 첫 글자(H)를 대신 그린다.
     설정에서 만든 아이콘(/api/favicon/[file])을 그대로 내준다 */
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // 관리 화면은 어디에도 끼워 넣지 못하게(클릭재킹) — 같은 키는 뒤의 값이 이긴다
      { source: "/admin/:path*", headers: [{ key: "X-Frame-Options", value: "DENY" }] },
    ];
  },
  async rewrites() {
    return [
      { source: "/favicon.ico", destination: "/api/favicon/ico" },
      { source: "/apple-touch-icon.png", destination: "/api/favicon/apple" },
      { source: "/apple-touch-icon-precomposed.png", destination: "/api/favicon/apple" },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);

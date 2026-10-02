import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: true,
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
  async rewrites() {
    return [
      { source: "/favicon.ico", destination: "/api/favicon/ico" },
      { source: "/apple-touch-icon.png", destination: "/api/favicon/apple" },
      { source: "/apple-touch-icon-precomposed.png", destination: "/api/favicon/apple" },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);

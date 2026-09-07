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
    ],
  },
};

export default withBundleAnalyzer(nextConfig);

import type { ReactNode } from "react";
import {
  // Frontend
  SiReact, SiNextdotjs, SiVuedotjs, SiNuxt, SiSvelte, SiAstro, SiRemix, SiAngular, SiSolid,
  SiQwik, SiAlpinedotjs, SiHtmx,
  // Languages
  SiTypescript, SiJavascript, SiPython, SiGo, SiRust, SiSwift, SiKotlin, SiCplusplus, SiSharp, SiRuby, SiPhp, SiDart,
  // Styling
  SiTailwindcss, SiCssmodules, SiStyledcomponents, SiSass, SiVanillaextract, SiUnocss,
  // UI Library
  SiShadcnui, SiRadixui, SiHeadlessui, SiChakraui, SiMui, SiAntdesign, SiMantine,
  // State
  SiRedux, SiReactquery, SiRecoil, SiMobx,
  // Data fetching
  SiTrpc, SiGraphql, SiApollographql, SiAxios,
  // Animation / 3D
  SiFramer, SiGreensock, SiThreedotjs, SiLottiefiles, SiD3, SiWebgl, SiWebgpu,
  // Backend
  SiNodedotjs, SiBun, SiDeno, SiExpress, SiFastify, SiNestjs, SiHono,
  SiDjango, SiFastapi, SiFlask, SiSpringboot, SiRubyonrails, SiLaravel,
  // Database
  SiPostgresql, SiMysql, SiSqlite, SiMongodb, SiRedis, SiElasticsearch,
  // BaaS / ORM
  SiSupabase, SiFirebase, SiAppwrite, SiPocketbase, SiPrisma, SiTypeorm,
  // AI / ML
  SiAnthropic, SiGooglegemini, SiLangchain, SiTensorflow, SiPytorch, SiHuggingface,
  // Mobile
  SiExpo, SiFlutter, SiJetpackcompose,
  // Desktop
  SiElectron, SiTauri,
  // Testing
  SiJest, SiVitest, SiCypress, SiTestinglibrary, SiMockserviceworker, SiStorybook,
  // Build
  SiVite, SiWebpack, SiTurborepo, SiEsbuild, SiSwc, SiRollupdotjs, SiPnpm, SiYarn,
  // Infra
  SiDocker, SiKubernetes, SiVercel, SiNetlify, SiCloudflare, SiCloudflareworkers,
  SiGooglecloud, SiRailway, SiRender, SiFlydotio, SiGithubactions,
} from "react-icons/si";
import { FaJava, FaAws, FaMicrosoft } from "react-icons/fa6";
/* OpenAI 는 react-icons 5.7 에서 Simple Icons 팩(`si`) 에서 사라졌다 —
   Simple Icons 가 상표 문제로 내린 아이콘이라 되돌아올 가능성이 낮다.
   RemixIcon 의 Fill 버전이 단색 채움이라 나머지 Si* 브랜드 마크와 결이 같다. */
import { RiOpenaiFill } from "react-icons/ri";

/** 기술명 → 아이콘. Select renderOption/renderValue 에서 lookup.
 *  매칭 안 되는 항목은 null 반환 → 아이콘 없이 텍스트만 노출. */
export function getTechIcon(name: string, size = 14): ReactNode {
  const key = normalizeTechName(name).toLowerCase();
  const icon = TECH_ICON_MAP[key];
  if (!icon) return null;
  const Icon = icon;
  return <Icon size={size} />;
}

/** 기술명 alias 정규화 — "react", "React", "리액트", "리엑트" → 모두 "React" 로 통일.
 *  중복 추가 방지 + alias 검색 / 매칭에 사용. */
const TECH_ALIAS: Record<string, string> = {
  // ── Frontend
  "react": "React", "리액트": "React", "리엑트": "React",
  "nextjs": "Next.js", "next": "Next.js", "넥스트": "Next.js", "넥스트제이에스": "Next.js",
  "vuejs": "Vue", "vue.js": "Vue", "뷰": "Vue",
  "nuxt.js": "Nuxt", "nuxtjs": "Nuxt", "넉스트": "Nuxt",
  "sveltekit": "SvelteKit",
  "스벨트": "Svelte",
  "앵귤러": "Angular",
  "솔리드": "Solid",
  // ── Language
  "ts": "TypeScript", "타입스크립트": "TypeScript",
  "js": "JavaScript", "자바스크립트": "JavaScript",
  "파이썬": "Python",
  "고": "Go", "golang": "Go",
  "러스트": "Rust",
  "자바": "Java",
  "코틀린": "Kotlin",
  "스위프트": "Swift",
  "씨플플": "C++", "씨샵": "C#",
  "루비": "Ruby",
  "피에이치피": "PHP",
  "다트": "Dart",
  // ── Styling
  "tailwind": "Tailwind CSS", "tailwindcss": "Tailwind CSS", "테일윈드": "Tailwind CSS",
  "scss": "Sass",
  "styled components": "styled-components",
  // ── State
  "react-redux": "Redux",
  // ── Data fetching
  "tanstack query": "React Query", "react-query": "React Query",
  "graph ql": "GraphQL",
  // ── Animation
  "framer-motion": "Framer Motion",
  "three": "Three.js", "threejs": "Three.js",
  "r3f": "React Three Fiber",
  "d3": "D3.js",
  // ── Backend
  "nodejs": "Node.js", "node": "Node.js", "노드": "Node.js",
  "nest": "NestJS", "nest.js": "NestJS",
  "spring": "Spring Boot", "스프링": "Spring Boot", "스프링부트": "Spring Boot",
  "장고": "Django",
  "플라스크": "Flask",
  "라라벨": "Laravel",
  // ── DB
  "postgres": "PostgreSQL", "psql": "PostgreSQL", "포스트그레": "PostgreSQL",
  "mongo": "MongoDB", "몽고": "MongoDB",
  "엘라스틱서치": "Elasticsearch",
  // ── BaaS
  "수파베이스": "Supabase",
  "파이어베이스": "Firebase",
  "프리즈마": "Prisma",
  // ── AI
  "openai": "OpenAI API", "gpt": "OpenAI API", "오픈에이아이": "OpenAI API",
  "claude": "Anthropic API", "anthropic": "Anthropic API",
  "gemini": "Gemini API",
  // ── Mobile
  "rn": "React Native",
  "플러터": "Flutter",
  // ── Desktop
  "일렉트론": "Electron",
  "타우리": "Tauri",
  // ── Testing
  "제스트": "Jest",
  "스토리북": "Storybook",
  // ── Build
  "비트": "Vite",
  "웹팩": "Webpack",
  // ── Infra
  "도커": "Docker",
  "쿠버네티스": "Kubernetes", "k8s": "Kubernetes",
  "버셀": "Vercel",
  "넷리파이": "Netlify",
  "클라우드플레어": "Cloudflare",
};

/** 입력된 기술명을 canonical preset 이름으로 정규화. alias 없으면 원본 그대로. */
export function normalizeTechName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  return TECH_ALIAS[lower] ?? trimmed;
}

/** 한글 음절 → 초성. "리액트" → "ㄹㅇㅌ", 영문/숫자는 그대로 */
function getChosung(str: string): string {
  const CHOSUNG = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  let out = "";
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const idx = Math.floor((code - 0xAC00) / 588);
      out += CHOSUNG[idx];
    } else {
      out += ch;
    }
  }
  return out;
}

/** canonical 이름의 alias 들 + 초성 (검색용). 예: "React" → ["react", "리액트", "ㄹㅇㅌ", "리엑트", "ㄹㅇㅌ"] */
export function getTechAliases(canonical: string): string[] {
  const target = canonical.toLowerCase();
  const aliases = new Set<string>();
  for (const [alias, mapped] of Object.entries(TECH_ALIAS)) {
    if (mapped.toLowerCase() === target) {
      aliases.add(alias);
      // 한글 alias 면 초성 검색도 추가
      const chosung = getChosung(alias);
      if (chosung !== alias) aliases.add(chosung);
    }
  }
  return [...aliases];
}

const TECH_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  // ── Frontend
  "react": SiReact,
  "next.js": SiNextdotjs,
  "vue": SiVuedotjs,
  "nuxt": SiNuxt,
  "svelte": SiSvelte,
  "sveltekit": SiSvelte,
  "astro": SiAstro,
  "remix": SiRemix,
  "angular": SiAngular,
  "solid": SiSolid,
  "qwik": SiQwik,
  "alpine.js": SiAlpinedotjs,
  "htmx": SiHtmx,

  // ── Languages
  "typescript": SiTypescript,
  "javascript": SiJavascript,
  "python": SiPython,
  "go": SiGo,
  "rust": SiRust,
  "swift": SiSwift,
  "kotlin": SiKotlin,
  "c++": SiCplusplus,
  "c#": SiSharp,
  "ruby": SiRuby,
  "php": SiPhp,
  "dart": SiDart,
  "java": FaJava,

  // ── Styling
  "tailwind css": SiTailwindcss,
  "css modules": SiCssmodules,
  "styled-components": SiStyledcomponents,
  "sass": SiSass,
  "vanilla-extract": SiVanillaextract,
  "unocss": SiUnocss,

  // ── UI Library
  "shadcn/ui": SiShadcnui,
  "radix ui": SiRadixui,
  "headless ui": SiHeadlessui,
  "chakra ui": SiChakraui,
  "material ui": SiMui,
  "ant design": SiAntdesign,
  "mantine": SiMantine,

  // ── State Management
  "redux": SiRedux,
  "redux toolkit": SiRedux,
  "recoil": SiRecoil,
  "mobx": SiMobx,

  // ── Data Fetching
  "react query": SiReactquery,
  "trpc": SiTrpc,
  "graphql": SiGraphql,
  "apollo client": SiApollographql,
  "axios": SiAxios,

  // ── Animation / 3D
  "framer motion": SiFramer,
  "gsap": SiGreensock,
  "three.js": SiThreedotjs,
  "react three fiber": SiThreedotjs,
  "lottie": SiLottiefiles,
  "d3.js": SiD3,
  "webgl": SiWebgl,
  "webgpu": SiWebgpu,

  // ── Backend
  "node.js": SiNodedotjs,
  "bun": SiBun,
  "deno": SiDeno,
  "express": SiExpress,
  "fastify": SiFastify,
  "nestjs": SiNestjs,
  "hono": SiHono,
  "django": SiDjango,
  "fastapi": SiFastapi,
  "flask": SiFlask,
  "spring boot": SiSpringboot,
  "ruby on rails": SiRubyonrails,
  "laravel": SiLaravel,

  // ── Database
  "postgresql": SiPostgresql,
  "mysql": SiMysql,
  "sqlite": SiSqlite,
  "mongodb": SiMongodb,
  "redis": SiRedis,
  "elasticsearch": SiElasticsearch,

  // ── BaaS / ORM
  "supabase": SiSupabase,
  "firebase": SiFirebase,
  "appwrite": SiAppwrite,
  "pocketbase": SiPocketbase,
  "prisma": SiPrisma,
  "typeorm": SiTypeorm,

  // ── AI / ML
  "openai api": RiOpenaiFill,
  "anthropic api": SiAnthropic,
  "gemini api": SiGooglegemini,
  "langchain": SiLangchain,
  "vercel ai sdk": SiVercel,
  "tensorflow": SiTensorflow,
  "pytorch": SiPytorch,
  "hugging face": SiHuggingface,

  // ── Mobile
  "react native": SiReact,
  "expo": SiExpo,
  "flutter": SiFlutter,
  "jetpack compose": SiJetpackcompose,

  // ── Desktop
  "electron": SiElectron,
  "tauri": SiTauri,

  // ── Testing
  "jest": SiJest,
  "vitest": SiVitest,
  "cypress": SiCypress,
  "testing library": SiTestinglibrary,
  "msw": SiMockserviceworker,
  "storybook": SiStorybook,

  // ── Build / Tooling
  "vite": SiVite,
  "webpack": SiWebpack,
  "turbopack": SiTurborepo,
  "turborepo": SiTurborepo,
  "esbuild": SiEsbuild,
  "swc": SiSwc,
  "rollup": SiRollupdotjs,
  "pnpm": SiPnpm,
  "yarn": SiYarn,

  // ── Infra / Deploy
  "docker": SiDocker,
  "kubernetes": SiKubernetes,
  "vercel": SiVercel,
  "netlify": SiNetlify,
  "cloudflare": SiCloudflare,
  "cloudflare workers": SiCloudflareworkers,
  "aws": FaAws,
  "azure": FaMicrosoft,
  "gcp": SiGooglecloud,
  "railway": SiRailway,
  "render": SiRender,
  "fly.io": SiFlydotio,
  "github actions": SiGithubactions,
};

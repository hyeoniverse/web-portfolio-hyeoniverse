export interface TechPreset {
  name: string;
  group: string;
}

/** 기술 스택 프리셋 — 분야별 그룹. Select group 헤더로 노출 + 아이콘은 techIcons 로 매핑.
 *  직접 입력으로도 자유롭게 추가 가능. */
export const TECH_PRESETS: TechPreset[] = [
  // ── Frontend Framework
  { name: "React", group: "Frontend" },
  { name: "Next.js", group: "Frontend" },
  { name: "Vue", group: "Frontend" },
  { name: "Nuxt", group: "Frontend" },
  { name: "Svelte", group: "Frontend" },
  { name: "SvelteKit", group: "Frontend" },
  { name: "Astro", group: "Frontend" },
  { name: "Remix", group: "Frontend" },
  { name: "Angular", group: "Frontend" },
  { name: "Solid", group: "Frontend" },
  { name: "Qwik", group: "Frontend" },
  { name: "Alpine.js", group: "Frontend" },
  { name: "HTMX", group: "Frontend" },

  // ── Language
  { name: "TypeScript", group: "Language" },
  { name: "JavaScript", group: "Language" },
  { name: "Python", group: "Language" },
  { name: "Go", group: "Language" },
  { name: "Rust", group: "Language" },
  { name: "Java", group: "Language" },
  { name: "Kotlin", group: "Language" },
  { name: "Swift", group: "Language" },
  { name: "C++", group: "Language" },
  { name: "C#", group: "Language" },
  { name: "Ruby", group: "Language" },
  { name: "PHP", group: "Language" },
  { name: "Dart", group: "Language" },

  // ── Styling
  { name: "Tailwind CSS", group: "Styling" },
  { name: "CSS Modules", group: "Styling" },
  { name: "styled-components", group: "Styling" },
  { name: "Sass", group: "Styling" },
  { name: "Emotion", group: "Styling" },
  { name: "vanilla-extract", group: "Styling" },
  { name: "Panda CSS", group: "Styling" },
  { name: "UnoCSS", group: "Styling" },

  // ── UI Library
  { name: "shadcn/ui", group: "UI Library" },
  { name: "Radix UI", group: "UI Library" },
  { name: "Headless UI", group: "UI Library" },
  { name: "Chakra UI", group: "UI Library" },
  { name: "Material UI", group: "UI Library" },
  { name: "Ant Design", group: "UI Library" },
  { name: "Mantine", group: "UI Library" },

  // ── State Management
  { name: "Zustand", group: "State Management" },
  { name: "Redux", group: "State Management" },
  { name: "Redux Toolkit", group: "State Management" },
  { name: "Jotai", group: "State Management" },
  { name: "Recoil", group: "State Management" },
  { name: "Valtio", group: "State Management" },
  { name: "MobX", group: "State Management" },

  // ── Data Fetching
  { name: "React Query", group: "Data Fetching" },
  { name: "SWR", group: "Data Fetching" },
  { name: "tRPC", group: "Data Fetching" },
  { name: "GraphQL", group: "Data Fetching" },
  { name: "Apollo Client", group: "Data Fetching" },
  { name: "Axios", group: "Data Fetching" },

  // ── Animation / Visual / 3D
  { name: "Framer Motion", group: "Animation / Visual" },
  { name: "GSAP", group: "Animation / Visual" },
  { name: "Three.js", group: "Animation / Visual" },
  { name: "React Three Fiber", group: "Animation / Visual" },
  { name: "Lottie", group: "Animation / Visual" },
  { name: "D3.js", group: "Animation / Visual" },
  { name: "Lenis", group: "Animation / Visual" },
  { name: "WebGL", group: "Animation / Visual" },
  { name: "WebGPU", group: "Animation / Visual" },

  // ── Backend Runtime
  { name: "Node.js", group: "Backend" },
  { name: "Bun", group: "Backend" },
  { name: "Deno", group: "Backend" },
  { name: "Express", group: "Backend" },
  { name: "Fastify", group: "Backend" },
  { name: "NestJS", group: "Backend" },
  { name: "Hono", group: "Backend" },
  { name: "Django", group: "Backend" },
  { name: "FastAPI", group: "Backend" },
  { name: "Flask", group: "Backend" },
  { name: "Spring Boot", group: "Backend" },
  { name: "Ruby on Rails", group: "Backend" },
  { name: "Laravel", group: "Backend" },

  // ── Database
  { name: "PostgreSQL", group: "Database" },
  { name: "MySQL", group: "Database" },
  { name: "SQLite", group: "Database" },
  { name: "MongoDB", group: "Database" },
  { name: "Redis", group: "Database" },
  { name: "Elasticsearch", group: "Database" },
  { name: "DynamoDB", group: "Database" },

  // ── BaaS / ORM
  { name: "Supabase", group: "BaaS / ORM" },
  { name: "Firebase", group: "BaaS / ORM" },
  { name: "Appwrite", group: "BaaS / ORM" },
  { name: "PocketBase", group: "BaaS / ORM" },
  { name: "Prisma", group: "BaaS / ORM" },
  { name: "Drizzle", group: "BaaS / ORM" },
  { name: "TypeORM", group: "BaaS / ORM" },

  // ── AI / ML
  { name: "OpenAI API", group: "AI / ML" },
  { name: "Anthropic API", group: "AI / ML" },
  { name: "Gemini API", group: "AI / ML" },
  { name: "LangChain", group: "AI / ML" },
  { name: "LlamaIndex", group: "AI / ML" },
  { name: "Vercel AI SDK", group: "AI / ML" },
  { name: "TensorFlow", group: "AI / ML" },
  { name: "PyTorch", group: "AI / ML" },
  { name: "Hugging Face", group: "AI / ML" },

  // ── Mobile
  { name: "React Native", group: "Mobile" },
  { name: "Expo", group: "Mobile" },
  { name: "Flutter", group: "Mobile" },
  { name: "SwiftUI", group: "Mobile" },
  { name: "Jetpack Compose", group: "Mobile" },

  // ── Desktop
  { name: "Electron", group: "Desktop" },
  { name: "Tauri", group: "Desktop" },

  // ── Testing
  { name: "Jest", group: "Testing" },
  { name: "Vitest", group: "Testing" },
  { name: "Cypress", group: "Testing" },
  { name: "Playwright", group: "Testing" },
  { name: "Testing Library", group: "Testing" },
  { name: "MSW", group: "Testing" },
  { name: "Storybook", group: "Testing" },

  // ── Build / Tooling
  { name: "Vite", group: "Build / Tooling" },
  { name: "Webpack", group: "Build / Tooling" },
  { name: "Turbopack", group: "Build / Tooling" },
  { name: "esbuild", group: "Build / Tooling" },
  { name: "SWC", group: "Build / Tooling" },
  { name: "Rollup", group: "Build / Tooling" },
  { name: "Parcel", group: "Build / Tooling" },
  { name: "Nx", group: "Build / Tooling" },
  { name: "Turborepo", group: "Build / Tooling" },
  { name: "pnpm", group: "Build / Tooling" },
  { name: "Yarn", group: "Build / Tooling" },

  // ── Infra / Deploy
  { name: "Docker", group: "Infra / Deploy" },
  { name: "Kubernetes", group: "Infra / Deploy" },
  { name: "Vercel", group: "Infra / Deploy" },
  { name: "Netlify", group: "Infra / Deploy" },
  { name: "Cloudflare", group: "Infra / Deploy" },
  { name: "Cloudflare Workers", group: "Infra / Deploy" },
  { name: "AWS", group: "Infra / Deploy" },
  { name: "GCP", group: "Infra / Deploy" },
  { name: "Azure", group: "Infra / Deploy" },
  { name: "Fly.io", group: "Infra / Deploy" },
  { name: "Railway", group: "Infra / Deploy" },
  { name: "Render", group: "Infra / Deploy" },
  { name: "GitHub Actions", group: "Infra / Deploy" },
];

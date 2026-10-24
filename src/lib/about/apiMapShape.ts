/* About API 지도의 모양 — 등급 · 서비스 이름과 생성 파일(data/generated/apiMap.ts)의 타입.
   화면(SceneApi)이 여기서 가져간다. 지도를 만드는 apiMap.ts 는 TypeScript 파서(typescript 패키지, gzip 1 MB)를
   불러오므로 화면이 그 파일을 import 하면 컴파일러가 브라우저 번들에 통째로 실린다. */
export const ACCESS_LEVELS = ["public", "signed-in", "author", "admin", "owner", "cron"] as const;
export type ApiAccess = (typeof ACCESS_LEVELS)[number];

/** 외부 서비스 — 짧게. 무엇으로 알아보는지는 SERVICE_RULES */
export const SERVICES = ["ai", "translate", "tts", "storage", "mail", "github", "photos", "weather", "fonts"] as const;
export type ApiService = (typeof SERVICES)[number];

interface ApiEndpoint {
  method: string;
  path: string;
  access: ApiAccess;
}

export interface ApiGroup {
  /** 묶음 이름 — 첫 경로 조각(admin 은 둘째 조각까지). 작은 묶음을 접은 것은 MISC_KEY · ADMIN_MISC_KEY */
  key: string;
  /** 이 묶음의 route.ts 수 */
  files: number;
  /** 접힌 묶음이면 원래 묶음 이름들 */
  folded?: string[];
  endpoints: ApiEndpoint[];
  tables: string[];
  rpcs: string[];
  services: ApiService[];
  access: Record<ApiAccess, number>;
}

export interface ApiMap {
  total: number;
  routeFiles: number;
  access: Record<ApiAccess, number>;
  tables: string[];
  rpcs: string[];
  services: ApiService[];
  groups: ApiGroup[];
}

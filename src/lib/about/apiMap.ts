/* route.ts 들 → About API 지도 파일 내용(scripts/gen-api-map.ts 가 쓰고, 테스트가 최신인지 대조한다)

   읽는 것(라우트 파일마다)
   · 주소 — src/app 아래 폴더 경로. 라우트 그룹 (x) 는 빼고 [param] 은 그대로 둔다
   · 내보낸 HTTP 메서드 — export function GET · export const GET = … · export const { GET, POST } = 공장(…)
   · 메서드마다 접근 등급 — 그 핸들러 본문(과 본문이 부르는 함수)에서 만나는 가드 호출로 정한다
       requireOwner → owner · requireRole(PERM.ADMIN) → admin · requireRole(PERM.AUTHOR) → author
       requirePostAccess → author(그 글 · 작업물의 저자만) · requireAuth → signed-in
       CRON_SECRET 비교 → cron · 아무것도 없으면 public
     가드가 여럿이면 가장 좁은 것을 쓴다(requireRole 도 안에서 requireAuth 를 부르니 결국 같은 줄이다)
   · 건드리는 테이블(.from("x"), .storage.from 은 빼고) · RPC(.rpc("x")) · 외부 서비스(가져온 모듈 · 주소로 추정)

   본문이 부르는 함수는 같은 파일의 함수와 @/lib · 상대 경로에서 가져온 함수를 세 단계까지 따라간다.
   공장(createCommentHandlers 처럼 { GET, POST } 를 돌려주는 함수)은 그 안의 같은 이름 함수를 핸들러로 읽고,
   공장에 넘긴 옵션의 table: "x" 를 테이블로 센다(공장 안에서는 .from(table) 이라 이름이 안 보인다).

   TypeScript 파서로 읽는다 — 정규식으로는 중첩 함수 · 구조 분해 내보내기를 가를 수 없다. 이 파일은 빌드 스크립트와
   테스트만 불러온다(화면은 생성 파일만 읽고, 여기서는 타입만 가져간다). */
import ts from "typescript";

export const ACCESS_LEVELS = ["public", "signed-in", "author", "admin", "owner", "cron"] as const;
export type ApiAccess = (typeof ACCESS_LEVELS)[number];

/** 외부 서비스 — 짧게. 무엇으로 알아보는지는 SERVICE_RULES */
const SERVICES = ["ai", "translate", "tts", "storage", "mail", "github", "photos", "weather", "fonts"] as const;
type ApiService = (typeof SERVICES)[number];

interface ApiEndpoint {
  method: string;
  path: string;
  access: ApiAccess;
}

interface ApiRoute {
  path: string;
  file: string;
  methods: { method: string; access: ApiAccess }[];
  tables: string[];
  rpcs: string[];
  services: ApiService[];
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

const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const RANK: Record<ApiAccess, number> = { public: 0, cron: 1, "signed-in": 2, author: 3, admin: 4, owner: 5 };

/** 가드 함수 → 등급(requireRole 은 인자로 가른다) */
const GUARDS: Record<string, ApiAccess> = {
  requireOwner: "owner",
  requirePostAccess: "author",
  requireAuth: "signed-in",
};

/**
 * 가드를 읽어서는 맞힐 수 없는 곳 — 같은 함수가 인자에 따라 다른 가드를 부른다.
 * lib/api/trashHandlers 의 authorizeTrashAction 은 calendars 면 requireAuth 만 하고(소유권 칸이 없다)
 * posts · works 면 requirePostAccess 를 한다. 따라가 읽으면 둘 다 보이니 calendars 만 여기서 바로잡는다.
 * 테스트가 이 주소들이 아직 있는지 확인한다.
 */
export const ACCESS_OVERRIDES: Record<string, ApiAccess> = {
  "POST /api/calendars/[calendarId]/restore": "signed-in",
  "DELETE /api/calendars/[calendarId]/purge": "signed-in",
};

/** 가져온 모듈 이름 · 문자열 주소 → 외부 서비스 */
const SERVICE_RULES: { service: ApiService; module?: RegExp; url?: RegExp }[] = [
  {
    service: "ai",
    module: /^@\/lib\/(ai\/(providers|models)|api\/aiSummary(Providers|Route)|demo\/(summary|cover)|autoCoverImage)$|^@huggingface\//,
    url: /api\.(openai|anthropic|groq|nanobananaapi)\.|generativelanguage\.googleapis/,
  },
  { service: "translate", module: /^@\/lib\/(api\/translationProviders|demo\/translate)$/, url: /deepl\.com|translation\.googleapis/ },
  { service: "tts", module: /^@\/lib\/(tts|speech|demo\/speech)$/, url: /fish\.audio|texttospeech\.googleapis/ },
  { service: "mail", module: /^@\/lib\/(mail\/|adminNotify$|commenterNotify$|auth\/knownDevices$)/, url: /api\.resend\.com/ },
  { service: "github", module: /^@\/lib\/github(Showcase|Profile)$/, url: /api\.github\.com/ },
  { service: "photos", url: /api\.(unsplash|pexels)\.com/ },
  { service: "weather", url: /open-meteo\.com/ },
  { service: "fonts", url: /fonts\.google\.com\// },
];

/** 이만큼보다 엔드포인트가 적은 묶음은 접는다 — 묶음이 50개 넘게 나와 빛줄기가 겹쳐 읽히지 않았다 */
const MIN_GROUP = 4;
const MISC_KEY = "etc";
const ADMIN_MISC_KEY = "admin";

/* ── 파일 경로 → 주소 ── */
export function routePathOf(file: string): string {
  const rel = file.replace(/\\/g, "/").replace(/^.*?src\/app\//, "").replace(/\/route\.tsx?$/, "");
  return "/" + rel.split("/").filter((s) => !/^\(.*\)$/.test(s)).join("/");
}

/** 묶음 이름 — 첫 조각, admin 은 둘째 조각까지(/auth/callback 은 auth) */
export function groupKeyOf(path: string): string {
  const seg = path.split("/").filter(Boolean);
  const rest = seg[0] === "api" ? seg.slice(1) : seg;
  if (rest[0] === "admin" && rest[1]) return `admin/${rest[1]}`;
  return rest[0] ?? "api";
}

/* ── 모듈 읽기 ── */
type ReadFile = (absPath: string) => string | null;
interface Mod {
  file: string;
  sf: ts.SourceFile;
  /** 가져온 이름 → { 모듈 지정자, 원래 이름 } */
  imports: Map<string, { spec: string; name: string }>;
  /** 최상위 함수(선언 · const 화살표) */
  fns: Map<string, ts.Node>;
}

function dirname(p: string) {
  return p.slice(0, p.lastIndexOf("/"));
}
function normalize(p: string) {
  const out: string[] = [];
  for (const s of p.split("/")) {
    if (s === "..") out.pop();
    else if (s !== ".") out.push(s);
  }
  return out.join("/");
}

class Loader {
  private cache = new Map<string, Mod | null>();
  constructor(private root: string, private read: ReadFile) {}

  resolve(from: string, spec: string): string | null {
    let base: string;
    if (spec.startsWith("@/")) base = `${this.root}/src/${spec.slice(2)}`;
    else if (spec.startsWith(".")) base = normalize(`${dirname(from)}/${spec}`);
    else return null;
    for (const c of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, base]) if (this.read(c) !== null && /\.tsx?$/.test(c)) return c;
    return null;
  }

  load(file: string): Mod | null {
    if (this.cache.has(file)) return this.cache.get(file)!;
    const src = this.read(file);
    if (src === null) {
      this.cache.set(file, null);
      return null;
    }
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const imports = new Map<string, { spec: string; name: string }>();
    const fns = new Map<string, ts.Node>();
    for (const st of sf.statements) {
      if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier) && st.importClause && !st.importClause.isTypeOnly) {
        const spec = st.moduleSpecifier.text;
        const ic = st.importClause;
        if (ic.name) imports.set(ic.name.text, { spec, name: "default" });
        if (ic.namedBindings && ts.isNamedImports(ic.namedBindings)) {
          for (const el of ic.namedBindings.elements) imports.set(el.name.text, { spec, name: (el.propertyName ?? el.name).text });
        }
      } else if (ts.isFunctionDeclaration(st) && st.name) {
        fns.set(st.name.text, st);
      } else if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) {
            fns.set(d.name.text, d.initializer);
          }
        }
      }
    }
    const mod = { file, sf, imports, fns };
    this.cache.set(file, mod);
    return mod;
  }
}

/* ── 본문 훑기 ── */
interface Facts {
  access: ApiAccess;
  tables: Set<string>;
  rpcs: Set<string>;
  services: Set<ApiService>;
}
const emptyFacts = (): Facts => ({ access: "public", tables: new Set(), rpcs: new Set(), services: new Set() });
const raise = (f: Facts, a: ApiAccess) => {
  if (RANK[a] > RANK[f.access]) f.access = a;
};

function servicesOfModule(spec: string, out: Set<ApiService>) {
  for (const r of SERVICE_RULES) if (r.module?.test(spec)) out.add(r.service);
}

const MAX_DEPTH = 3;
/** 들른 함수 — 조건 없이 들렀는지(1) · 조건 안에서 들렀는지(2) */
type Seen = Map<ts.Node, number>;

/**
 * 본문 훑기. cond 는 "if · 삼항 · && · switch 안" 이라는 뜻이다 — 거기서 만난 가드는 등급에 넣지 않는다.
 * GET /api/posts 는 ?trash=true 일 때만 requireAuth 를 부르는데, 그걸 세면 공개 목록이 로그인 전용으로 보였다.
 * 테이블 · RPC · 서비스는 조건과 상관없이 센다(그 길로 갈 수 있다는 사실은 같다).
 */
function scan(node: ts.Node, mod: Mod, loader: Loader, facts: Facts, seen: Seen, depth: number, cond = false) {
  const bit = cond ? 2 : 1;
  const was = seen.get(node) ?? 0;
  if (was & bit || (cond && was & 1)) return;
  seen.set(node, was | bit);
  const follow = (name: string, c: boolean) => {
    if (depth >= MAX_DEPTH) return;
    const local = mod.fns.get(name);
    if (local) return scan(local, mod, loader, facts, seen, depth + 1, c);
    const imp = mod.imports.get(name);
    if (!imp) return;
    servicesOfModule(imp.spec, facts.services);
    const file = loader.resolve(mod.file, imp.spec);
    const target = file && loader.load(file);
    const fn = target && target.fns.get(imp.name);
    if (target && fn) scan(fn, target, loader, facts, seen, depth + 1, c);
  };
  const guard = (a: ApiAccess, c: boolean) => {
    if (!c) raise(facts, a);
  };
  const visit = (n: ts.Node, c: boolean): void => {
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      const arg0 = n.arguments[0];
      if (ts.isIdentifier(callee)) {
        const name = callee.text;
        if (GUARDS[name]) guard(GUARDS[name], c);
        else if (name === "requireRole") guard(/AUTHOR|\b1\b/.test(arg0 ? arg0.getText() : "") ? "author" : "admin", c);
        else follow(name, c);
      } else if (ts.isPropertyAccessExpression(callee) && arg0 && ts.isStringLiteralLike(arg0)) {
        const prop = callee.name.text;
        const owner = callee.expression;
        const isStorage = ts.isPropertyAccessExpression(owner) && owner.name.text === "storage";
        if (prop === "from" && !isStorage) facts.tables.add(arg0.text);
        if (prop === "rpc") facts.rpcs.add(arg0.text);
      }
    }
    if (ts.isPropertyAccessExpression(n)) {
      if (n.name.text === "storage") facts.services.add("storage");
      /* CRON_SECRET 은 늘 if (헤더 !== 비밀) return 401 꼴이라 조건과 상관없이 센다 */
      if (n.name.text === "CRON_SECRET") raise(facts, "cron");
    }
    if (ts.isStringLiteralLike(n) || n.kind === ts.SyntaxKind.TemplateHead || n.kind === ts.SyntaxKind.TemplateMiddle || n.kind === ts.SyntaxKind.TemplateTail) {
      const text = (n as ts.LiteralLikeNode).text;
      for (const r of SERVICE_RULES) if (r.url?.test(text)) facts.services.add(r.service);
    }
    /* 조건 안으로 들어가는 자리 */
    if (ts.isIfStatement(n)) {
      visit(n.expression, c);
      visit(n.thenStatement, true);
      if (n.elseStatement) visit(n.elseStatement, true);
      return;
    }
    if (ts.isConditionalExpression(n)) {
      visit(n.condition, c);
      visit(n.whenTrue, true);
      visit(n.whenFalse, true);
      return;
    }
    if (ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(n.operatorToken.kind)) {
      visit(n.left, c);
      visit(n.right, true);
      return;
    }
    if (ts.isCaseClause(n) || ts.isDefaultClause(n)) {
      n.statements.forEach((x) => visit(x, true));
      return;
    }
    ts.forEachChild(n, (x) => visit(x, c));
  };
  visit(node, cond);
}

/** 공장 함수 본문 안에서 이름이 METHOD 인 함수(선언 · const 화살표) */
function innerFunction(factory: ts.Node, method: string): ts.Node | null {
  let found: ts.Node | null = null;
  const visit = (n: ts.Node) => {
    if (found) return;
    if (ts.isFunctionDeclaration(n) && n.name?.text === method) found = n;
    else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === method && n.initializer) found = n.initializer;
    else ts.forEachChild(n, visit);
  };
  ts.forEachChild(factory, visit);
  return found;
}

/** 공장에 넘긴 옵션 객체의 table: "x" */
function optionTables(call: ts.CallExpression, out: Set<string>) {
  for (const a of call.arguments) {
    if (!ts.isObjectLiteralExpression(a)) continue;
    for (const p of a.properties) {
      if (ts.isPropertyAssignment(p) && p.name.getText() === "table" && ts.isStringLiteralLike(p.initializer)) out.add(p.initializer.text);
    }
  }
}

const isExported = (n: ts.Node) => !!ts.getModifiers(n as ts.HasModifiers)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/** 라우트 파일 하나 읽기 */
function analyzeRoute(file: string, loader: Loader): ApiRoute | null {
  const mod = loader.load(file);
  if (!mod) return null;
  const path = routePathOf(file);
  const methods: { method: string; access: ApiAccess }[] = [];
  const all = emptyFacts();
  /* 라우트 파일이 가져온 모듈만으로도 서비스를 짐작한다(본문이 직접 부르지 않고 넘기기만 하는 경우) */
  for (const { spec } of mod.imports.values()) servicesOfModule(spec, all.services);

  const add = (method: string, nodes: ts.Node[], ctx: Mod = mod, extra?: (f: Facts) => void) => {
    const f = emptyFacts();
    const seen: Seen = new Map();
    for (const n of nodes) scan(n, ctx, loader, f, seen, 0);
    extra?.(f);
    const access = ACCESS_OVERRIDES[`${method} ${path}`] ?? f.access;
    methods.push({ method, access });
    f.tables.forEach((t) => all.tables.add(t));
    f.rpcs.forEach((t) => all.rpcs.add(t));
    f.services.forEach((t) => all.services.add(t));
  };

  for (const st of mod.sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name && METHODS.has(st.name.text) && isExported(st)) {
      add(st.name.text, [st]);
    } else if (ts.isVariableStatement(st) && isExported(st)) {
      for (const d of st.declarationList.declarations) {
        const init = d.initializer;
        if (!init) continue;
        if (ts.isIdentifier(d.name) && METHODS.has(d.name.text)) {
          /* export const GET = 화살표 · withX(핸들러) · 다른 핸들러 이름 */
          add(d.name.text, [init]);
        } else if (ts.isObjectBindingPattern(d.name) && ts.isCallExpression(init) && ts.isIdentifier(init.expression)) {
          /* export const { GET, POST } = 공장(옵션) — 공장 안의 같은 이름 함수가 핸들러 */
          const imp = mod.imports.get(init.expression.text);
          const target = imp ? loader.load(loader.resolve(file, imp.spec) ?? "") : mod;
          const factory = target?.fns.get(imp ? imp.name : init.expression.text);
          if (imp) servicesOfModule(imp.spec, all.services);
          for (const el of d.name.elements) {
            const name = (el.propertyName ?? el.name).getText();
            if (!METHODS.has(el.name.getText())) continue;
            const inner = factory && innerFunction(factory, name);
            if (target && inner) add(el.name.getText(), [inner], target, (f) => optionTables(init, f.tables));
            else add(el.name.getText(), [init]);
          }
        }
      }
    } else if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) {
      /* export { GET } from "…" · export { handler as GET } */
      for (const el of st.exportClause.elements) {
        if (!METHODS.has(el.name.text)) continue;
        const local = (el.propertyName ?? el.name).text;
        if (st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
          const target = loader.load(loader.resolve(file, st.moduleSpecifier.text) ?? "");
          const fn = target?.fns.get(local);
          if (target && fn) add(el.name.text, [fn], target);
          else add(el.name.text, []);
        } else {
          const fn = mod.fns.get(local);
          add(el.name.text, fn ? [fn] : []);
        }
      }
    }
  }
  if (!methods.length) return null;
  const order = [...METHODS];
  methods.sort((a, b) => order.indexOf(a.method) - order.indexOf(b.method));
  return {
    path,
    file: file.slice(file.indexOf("src/app/")),
    methods,
    tables: [...all.tables].sort(),
    rpcs: [...all.rpcs].sort(),
    services: SERVICES.filter((s) => all.services.has(s)),
  };
}

const zeroAccess = (): Record<ApiAccess, number> =>
  Object.fromEntries(ACCESS_LEVELS.map((a) => [a, 0])) as Record<ApiAccess, number>;

/**
 * 라우트 → 묶음.
 * 묶음 이름은 첫 경로 조각, admin 만 둘째 조각까지 가른다(관리자 쪽이 가장 크고 성격이 제각각이라).
 * 엔드포인트가 MIN_GROUP 보다 적은 묶음은 접는다 — admin/x 는 'admin' 하나로, 나머지는 'etc' 하나로.
 * 접은 묶음의 원래 이름은 folded 에 남는다.
 */
function groupRoutes(routes: ApiRoute[]): ApiGroup[] {
  const raw = new Map<string, ApiRoute[]>();
  for (const r of routes) {
    const k = groupKeyOf(r.path);
    raw.set(k, [...(raw.get(k) ?? []), r]);
  }
  const size = (rs: ApiRoute[]) => rs.reduce((s, r) => s + r.methods.length, 0);
  const merged = new Map<string, { routes: ApiRoute[]; folded?: string[] }>();
  for (const [k, rs] of raw) {
    const key = size(rs) >= MIN_GROUP ? k : k.startsWith("admin/") ? ADMIN_MISC_KEY : MISC_KEY;
    const cur = merged.get(key) ?? { routes: [] };
    cur.routes.push(...rs);
    if (key !== k) cur.folded = [...(cur.folded ?? []), k];
    merged.set(key, cur);
  }
  const groups: ApiGroup[] = [];
  for (const [key, { routes: rs, folded }] of merged) {
    const endpoints = rs
      .flatMap((r) => r.methods.map((m) => ({ method: m.method, path: r.path, access: m.access })))
      .sort((a, b) => a.path.localeCompare(b.path) || [...METHODS].indexOf(a.method) - [...METHODS].indexOf(b.method));
    const access = zeroAccess();
    for (const e of endpoints) access[e.access]++;
    const services = new Set(rs.flatMap((r) => r.services));
    groups.push({
      key,
      files: rs.length,
      ...(folded ? { folded: folded.sort() } : {}),
      endpoints,
      tables: [...new Set(rs.flatMap((r) => r.tables))].sort(),
      rpcs: [...new Set(rs.flatMap((r) => r.rpcs))].sort(),
      services: SERVICES.filter((s) => services.has(s)),
      access,
    });
  }
  /* 큰 묶음부터, 같으면 이름순 — 접은 묶음은 맨 뒤 */
  const tail = (g: ApiGroup) => (g.folded ? 1 : 0);
  return groups.sort((a, b) => tail(a) - tail(b) || b.endpoints.length - a.endpoints.length || a.key.localeCompare(b.key));
}

/**
 * 라우트 파일 목록 → 지도. root 는 저장소 경로, files 는 root 기준 절대 경로, read 는 파일 읽기(없으면 null).
 * 파일 시스템을 받지 않고 read 를 받는 이유: 테스트가 가짜 파일로 돌린다.
 */
export function buildApiMap(root: string, files: string[], read: ReadFile): ApiMap {
  const loader = new Loader(root.replace(/\\/g, "/").replace(/\/$/, ""), read);
  const routes = files
    .map((f) => analyzeRoute(f.replace(/\\/g, "/"), loader))
    .filter((r): r is ApiRoute => !!r)
    .sort((a, b) => a.path.localeCompare(b.path));
  const groups = groupRoutes(routes);
  const access = zeroAccess();
  for (const g of groups) for (const a of ACCESS_LEVELS) access[a] += g.access[a];
  const services = new Set(routes.flatMap((r) => r.services));
  return {
    total: groups.reduce((s, g) => s + g.endpoints.length, 0),
    routeFiles: routes.length,
    access,
    tables: [...new Set(routes.flatMap((r) => r.tables))].sort(),
    rpcs: [...new Set(routes.flatMap((r) => r.rpcs))].sort(),
    services: SERVICES.filter((s) => services.has(s)),
    groups,
  };
}

export function renderApiMap(map: ApiMap): string {
  return [
    "/* 자동 생성 — 손으로 고치지 마세요. 원본: src/app/api · src/app/auth 의 route.ts, 생성: npm run gen-api-map (scripts/gen-api-map.ts) */",
    'import type { ApiMap } from "@/lib/about/apiMap";',
    "",
    `export const apiMap: ApiMap = ${JSON.stringify(map, null, 2)};`,
    "",
  ].join("\n");
}

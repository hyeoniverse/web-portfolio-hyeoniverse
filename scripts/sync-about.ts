/**
 * content/about/**\/*.md → site_settings.config 단방향 동기화
 *
 * 사용법:
 *   npx tsx scripts/sync-about.ts            # 동기화
 *   npx tsx scripts/sync-about.ts --dry      # 무엇이 바뀌는지만 출력 (DB 쓰기 없음)
 *   npx tsx scripts/sync-about.ts --eject    # 지금 DB/기본값을 md 파일로 꺼낸다 (DB 안 건드림)
 *
 * 실행 전 .env.local 에 NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 필요.
 * 없으면 건너뛴다 — Supabase 없이 빌드할 때도 안전하게.
 *
 * 동작
 *   1. site_settings 를 읽어 지금 delta 와 병합된 config 를 만든다
 *   2. about.contentSource 에서 "markdown" 인 패널만 고른다
 *   3. 그 패널의 content/about/<dir>/ 를 읽어 항목 배열을 만든다
 *   4. 저장된 delta 위에 **그 패널 경로만** 덮어 쓴다 (buildDeltaPayload)
 *
 * 4번이 핵심이다. site_settings 는 한 행짜리 jsonb 라 config 를 통째로 쓰면 About 과
 * 무관한 설정까지 같이 써 버린다. 설정 화면의 섹션 저장과 같은 규칙을 공유한다.
 *
 * 파일이 없거나 폴더가 비어 있으면 그 패널을 건드리지 않는다 — sync-posts 와 같게,
 * 삭제는 하지 않는다.
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";
import { deepMerge, unwrapDelta, buildDeltaPayload, deepEqual } from "@/lib/settingsDelta";
import { parseDecisionMarkdown, mergeDecisionPair, itemToMarkdown, itemFileName } from "@/lib/about/decisionsMarkdown";
import {
  parseSimpleMarkdown, securityPanel, featuresPanel, processPanel, overviewPanel, creditsPanel,
  type SimpleDoc,
} from "@/lib/about/panelMarkdown";
import { MARKDOWN_PANELS } from "@/lib/about/contentSources";
import { checkAboutContent } from "@/lib/api/validateAboutContent";
import { aboutDecisions } from "@/data/generated/aboutContent";
import type { TroubleShootingItem } from "@/data/about/types";

loadEnv({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry");
const EJECT = process.argv.includes("--eject");
const CONTENT_ROOT = path.resolve(process.cwd(), "content/about");

/** md 안의 이미지가 빌드 후 실제로 놓이는 자리. sync-content-assets.ts 가 여기로 복사한다. */
const ASSET_URL_ROOT = "/content/about";

interface PanelAdapter {
  /**
   * 이 어댑터가 쓰는 config 경로들 — delta 를 이 경로들만 덮는다.
   * 항목 배열 하나인 패널은 한 개, Overview 처럼 평평한 키 여러 개를 쓰는 패널은 여러 개다.
   */
  configPaths: string[];
  /** content/about/ 아래 폴더(항목이 여럿) 또는 파일 이름(항목이 하나). */
  dir: string;
  /** 파일 하나로 끝나는 패널 — content/about/<dir>.md 를 읽는다. */
  single?: boolean;
  /** 화면에 쓰는 이름 (로그용). */
  label: string;
  /** md 파일 목록 → { config 경로: 값 } */
  load(files: LoadedPair[], warn: (message: string) => void): Record<string, unknown>;
  /** 지금 about 값 → md 파일 목록 (--eject). */
  dump(about: Record<string, unknown>): Array<{ name: string; body: string }>;
  /** 항목 수 (로그용). 배열이 아닌 패널은 1. */
  count(value: Record<string, unknown>): number;
}

interface LoadedPair {
  /** 파일명에서 뽑은 id (번호 접두사 제거). */
  id: string;
  base: string;
  ko: string;
  en?: string;
  /** ko/en 중 나중에 고친 시각 (ms). 화면 편집과 견주는 값. */
  mtime: number;
}

/**
 * `01-role-stored-in-app-metadata.md` → `role-stored-in-app-metadata`
 * 번호는 표시 순서일 뿐이라 id 에서 뺀다. 순서를 바꾸려고 번호만 고쳐도 항목은 유지된다.
 */
function idFromFileName(base: string): string {
  return base.replace(/^\d+[-_]/, "");
}

const decisionsAdapter: PanelAdapter = {
  configPaths: ["about.troubleshooting"],
  dir: MARKDOWN_PANELS.troubleshooting.dir,
  label: MARKDOWN_PANELS.troubleshooting.label,
  count: (v) => (v["about.troubleshooting"] as unknown[]).length,
  load(files, warn) {
    const items: TroubleShootingItem[] = [];
    const seen = new Set<string>();
    for (const file of files) {
      const ko = parseDecisionMarkdown(file.ko, file.id);
      const en = file.en ? parseDecisionMarkdown(file.en, file.id) : undefined;
      for (const message of ko.warnings) warn(`${file.base}.md — ${message}`);
      for (const message of en?.warnings ?? []) warn(`${file.base}.en.md — ${message}`);
      /* 같은 id 가 둘이면 나중 것이 앞의 것을 덮어 조용히 하나가 사라진다. */
      if (seen.has(ko.id)) {
        warn(`id 가 겹칩니다 — "${ko.id}" (${file.base}). 이 파일은 건너뜁니다`);
        continue;
      }
      seen.add(ko.id);
      items.push(mergeDecisionPair(ko, en));
    }
    return { "about.troubleshooting": items };
  },
  dump(about) {
    const current = (about.troubleshooting as TroubleShootingItem[] | undefined)?.length
      ? (about.troubleshooting as TroubleShootingItem[])
      : aboutDecisions;
    return current.flatMap((item, index) => [
      { name: itemFileName(item, index, "ko"), body: itemToMarkdown(item, "ko") },
      { name: itemFileName(item, index, "en"), body: itemToMarkdown(item, "en") },
    ]);
  },
};

/**
 * 산문형 패널 — 머리말 + 제목 + 본문 하나로 끝나는 항목 목록.
 * Security · Features · Process 가 모양이 같아 한 틀을 공유한다.
 *
 * 항목의 정체성은 **파일 순서**다. id 필드가 없는 패널이라 파일명은 사람이 읽으라고
 * 있는 것이고, 순서를 바꾸려면 앞의 번호를 고치면 된다.
 */
function listAdapter<T>(opts: {
  key: string;
  panel: {
    fileName(item: T, i: number): string;
    write(item: T, lang: "ko" | "en"): string;
    read(ko: SimpleDoc, en: SimpleDoc | undefined): T;
    optionalBody?: boolean;
  };
  fallback: readonly T[];
}): PanelAdapter {
  const configPath = `about.${opts.key}`;
  const def = MARKDOWN_PANELS[opts.key];
  return {
    configPaths: [configPath],
    dir: def.dir,
    label: def.label,
    count: (v) => (v[configPath] as unknown[]).length,
    load(files, warn) {
      const items: T[] = [];
      for (const file of files) {
        const po = { optionalBody: opts.panel.optionalBody };
        const ko = parseSimpleMarkdown(file.ko, po);
        const en = file.en ? parseSimpleMarkdown(file.en, po) : undefined;
        for (const message of ko.warnings) warn(`${file.base}.md — ${message}`);
        for (const message of en?.warnings ?? []) warn(`${file.base}.en.md — ${message}`);
        items.push(opts.panel.read(ko, en));
      }
      return { [configPath]: items };
    },
    dump(about) {
      const stored = about[opts.key] as T[] | undefined;
      const current = stored?.length ? stored : opts.fallback;
      return current.flatMap((item, index) => {
        const base = opts.panel.fileName(item, index);
        return [
          { name: `${base}.md`, body: opts.panel.write(item, "ko") },
          { name: `${base}.en.md`, body: opts.panel.write(item, "en") },
        ];
      });
    },
  };
}

/** 파일 하나로 끝나는 패널 — Overview · Credits 처럼 평평한 키 몇 개를 한 문서에 담는다. */
function singleAdapter<T extends Record<string, unknown>>(opts: {
  key: string;
  keys: string[];
  panel: {
    write(values: T, lang: "ko" | "en"): string;
    read(ko: SimpleDoc, en: SimpleDoc | undefined): T;
    optionalBody?: boolean;
  };
}): PanelAdapter {
  const def = MARKDOWN_PANELS[opts.key];
  return {
    configPaths: opts.keys.map((k) => `about.${k}`),
    dir: def.dir,
    label: def.label,
    single: true,
    count: () => 1,
    load(files, warn) {
      const file = files[0];
      const po = { optionalBody: opts.panel.optionalBody };
      const ko = parseSimpleMarkdown(file.ko, po);
      const en = file.en ? parseSimpleMarkdown(file.en, po) : undefined;
      for (const message of ko.warnings) warn(`${def.dir}.md — ${message}`);
      const values = opts.panel.read(ko, en);
      return Object.fromEntries(opts.keys.map((k) => [`about.${k}`, values[k]]));
    },
    dump(about) {
      const values = Object.fromEntries(opts.keys.map((k) => [k, about[k]])) as T;
      return [
        { name: `${def.dir}.md`, body: opts.panel.write(values, "ko") },
        { name: `${def.dir}.en.md`, body: opts.panel.write(values, "en") },
      ];
    },
  };
}

const ADAPTERS: Record<string, PanelAdapter> = {
  troubleshooting: decisionsAdapter,
  security: listAdapter({ key: "security", panel: securityPanel, fallback: siteConfig.about.security }),
  features: listAdapter({ key: "features", panel: featuresPanel, fallback: siteConfig.about.features }),
  process: listAdapter({ key: "process", panel: processPanel, fallback: siteConfig.about.process }),
  overview: singleAdapter({
    key: "overview", panel: overviewPanel,
    keys: ["overview_description_ko", "overview_description_en", "overview_highlights", "overview_stats"],
  }),
  credits: singleAdapter({
    key: "credits", panel: creditsPanel,
    keys: ["creditsNames", "creditsNote", "creditsNote_ko"],
  }),
};

/** `<dir>/` 의 md 를 ko/en 쌍으로 묶어 파일명 순으로 돌려준다. */
function collectPairs(dir: string): LoadedPair[] {
  if (!fs.existsSync(dir)) return [];
  const names = fs.readdirSync(dir).filter((n) => n.endsWith(".md")).sort();
  const pairs: LoadedPair[] = [];
  for (const name of names) {
    if (name.endsWith(".en.md")) continue; // 짝으로만 읽는다
    const base = name.slice(0, -3);
    const enPath = path.join(dir, `${base}.en.md`);
    const koStat = fs.statSync(path.join(dir, name));
    const enStat = fs.existsSync(enPath) ? fs.statSync(enPath) : null;
    pairs.push({
      id: idFromFileName(base),
      base,
      ko: fs.readFileSync(path.join(dir, name), "utf8"),
      en: enStat ? fs.readFileSync(enPath, "utf8") : undefined,
      mtime: Math.max(koStat.mtimeMs, enStat?.mtimeMs ?? 0),
    });
  }
  return pairs;
}

/**
 * md 안의 상대 경로 이미지를 서빙 경로로 바꾼다.
 *
 * 파일 옆에 둔 이미지를 `./01-foo/flow.svg` 로 참조하면 VS Code 미리보기에서 그대로 보인다.
 * 실제로 서빙되는 자리는 prebuild 가 복사해 둔 `/content/about/...` 이라 여기서 바꿔 준다.
 */
function rewriteAssetPaths(raw: string, panelDir: string, warn: (m: string) => void): string {
  return raw.replace(/!\[([^\]]*)\]\((\.\/[^)]+)\)/g, (_all, alt: string, rel: string) => {
    const clean = rel.replace(/^\.\//, "");
    const onDisk = path.join(CONTENT_ROOT, panelDir, clean);
    if (!fs.existsSync(onDisk)) warn(`이미지가 없습니다 — ${path.relative(process.cwd(), onDisk)}`);
    const prefix = panelDir ? `${ASSET_URL_ROOT}/${panelDir}` : ASSET_URL_ROOT;
    return `![${alt}](${prefix}/${clean})`;
  });
}

/** 파일 하나짜리 패널 — content/about/<name>.md 와 <name>.en.md. */
function collectSingle(name: string): LoadedPair[] {
  const koPath = path.join(CONTENT_ROOT, `${name}.md`);
  if (!fs.existsSync(koPath)) return [];
  const enPath = path.join(CONTENT_ROOT, `${name}.en.md`);
  const enStat = fs.existsSync(enPath) ? fs.statSync(enPath) : null;
  return [{
    id: name,
    base: name,
    ko: fs.readFileSync(koPath, "utf8"),
    en: enStat ? fs.readFileSync(enPath, "utf8") : undefined,
    mtime: Math.max(fs.statSync(koPath).mtimeMs, enStat?.mtimeMs ?? 0),
  }];
}

async function main() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const defaults = structuredClone(siteConfig) as unknown as SiteConfigData;

  /* --eject 는 DB 없이도 돈다 — 정적 기본값만으로 파일을 꺼낼 수 있어야 처음 옮길 때 편하다. */
  let storedDelta: Record<string, unknown> = {};
  let merged = defaults;
  let supabase: ReturnType<typeof createClient> | null = null;

  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await supabase
      .from("site_settings").select("config").eq("id", "default").single<{ config: unknown }>();
    if (error) {
      console.error(`✖ site_settings 를 읽지 못했습니다 — ${error.message}`);
      process.exit(1);
    }
    storedDelta = unwrapDelta(data?.config);
    merged = deepMerge(structuredClone(defaults), storedDelta as never);
  } else if (!EJECT) {
    console.log("⏭  Supabase 환경변수 없음 — 동기화 건너뜀");
    return;
  }

  const about = merged.about as Record<string, unknown>;
  const editedAt = (about.contentEditedAt ?? {}) as Record<string, string>;

  if (EJECT) {
    for (const adapter of Object.values(ADAPTERS)) {
      const files = adapter.dump(about);
      /* 파일 하나짜리 패널은 폴더를 만들지 않고 content/about/ 바로 아래에 쓴다. */
      const dir = adapter.single ? CONTENT_ROOT : path.join(CONTENT_ROOT, adapter.dir);
      fs.mkdirSync(dir, { recursive: true });
      for (const file of files) fs.writeFileSync(path.join(dir, file.name), file.body, "utf8");
      console.log(`📤 ${adapter.label} — ${files.length}개 파일 → ${path.relative(process.cwd(), dir)}/`);
    }
    console.log(`\n다음 단계: site.config 의 about.contentSource 에 패널을 "markdown" 으로 적고 동기화하세요.`);
    return;
  }

  const targets = Object.entries(ADAPTERS);

  let warningCount = 0;
  const warn = (message: string) => { warningCount++; console.warn(`   ⚠ ${message}`); };

  const nextConfig = merged;
  const changedPaths: string[] = [];

  for (const [key, adapter] of targets) {
    const pairs = adapter.single
      ? collectSingle(adapter.dir)
      : collectPairs(path.join(CONTENT_ROOT, adapter.dir));
    const where = adapter.single
      ? path.join("content/about", `${adapter.dir}.md`)
      : path.relative(process.cwd(), path.join(CONTENT_ROOT, adapter.dir)) + "/";
    if (pairs.length === 0) {
      /* 지우지 않는다 — 폴더를 비운 게 "다 삭제" 라는 뜻일 수도, 아직 안 옮긴 것일 수도 있다. */
      console.log(`   · ${adapter.label} — ${where} 에 파일 없음`);
      continue;
    }

    /* 더 최근에 손댄 쪽을 남긴다. 화면에서 저장한 시각이 파일 수정 시각보다 나중이면
       그 패널은 건드리지 않는다 — 방금 고친 걸 오래된 파일이 덮으면 안 된다.
       (sync-posts 가 mtime 과 updated_at 을 견주는 것과 같은 규칙) */
    const fileTime = Math.max(...pairs.map((p) => p.mtime));
    const uiTime = Date.parse(editedAt[key] ?? "") || 0;
    if (uiTime > fileTime) {
      const when = new Date(uiTime).toISOString().slice(0, 16).replace("T", " ");
      console.log(`   · ${adapter.label} — 화면에서 더 최근에 고침(${when}) → 건너뜀`);
      continue;
    }

    const assetDir = adapter.single ? "" : adapter.dir;
    const rewritten = pairs.map((pair) => ({
      ...pair,
      ko: rewriteAssetPaths(pair.ko, assetDir, warn),
      en: pair.en ? rewriteAssetPaths(pair.en, assetDir, warn) : undefined,
    }));

    const values = adapter.load(rewritten, warn);
    const changedHere = adapter.configPaths.filter((configPath) => {
      const key = configPath.slice("about.".length);
      return !deepEqual((nextConfig.about as Record<string, unknown>)[key], values[configPath]);
    });
    if (changedHere.length === 0) {
      console.log(adapter.single
        ? `   = ${adapter.label} — 변경 없음`
        : `   = ${adapter.label} — ${adapter.count(values)}개, 변경 없음`);
      continue;
    }
    for (const configPath of adapter.configPaths) {
      const key = configPath.slice("about.".length);
      (nextConfig.about as Record<string, unknown>)[key] = values[configPath];
    }
    changedPaths.push(...changedHere);
    console.log(adapter.single
      ? `   ↻ ${adapter.label} — ${changedHere.length}개 값`
      : `   ↻ ${adapter.label} — ${pairs.length}개 파일 → ${adapter.count(values)}개 항목`);
  }

  if (changedPaths.length === 0) {
    console.log(`\n✔ 바뀐 패널 없음${warningCount ? ` (경고 ${warningCount}건)` : ""}`);
    return;
  }

  /* 어느 패널이 언제 파일에서 들어왔는지 남긴다 — 설정 화면이 잠긴 패널 옆에 보여준다.
     값이 바뀐 패널만 찍는다. 매번 찍으면 내용이 그대로인데도 delta 가 계속 달라진다. */
  const stamp = new Date().toISOString();
  const syncedAt = { ...((nextConfig.about as Record<string, unknown>).contentSyncedAt as Record<string, string> ?? {}) };
  for (const [key, adapter] of targets) {
    if (adapter.configPaths.some((cp) => changedPaths.includes(cp))) syncedAt[key] = stamp;
  }
  (nextConfig.about as Record<string, unknown>).contentSyncedAt = syncedAt;
  changedPaths.push("about.contentSyncedAt");

  /* 경고는 전부 "실수" 신호다 — 모르는 소제목, 빈 단, 범위 밖 난이도, 겹친 id, 없는 이미지.
     정상 운영 중에 나오는 것이 없다(en 파일이 없는 경우는 조용히 ko 를 쓴다).
     그대로 쓰면 소제목 오타 하나가 배포된 화면의 빈 섹션이 된다. --dry 는 어차피 안 쓴다. */
  if (warningCount > 0 && !DRY_RUN) {
    console.error(`\n✖ 경고 ${warningCount}건 — 고치고 다시 실행하세요. (--dry 로 먼저 확인)`);
    process.exit(1);
  }

  const payload = buildDeltaPayload(storedDelta, nextConfig, defaults, changedPaths);

  /* 설정 화면 PATCH 와 같은 검사를 지난다. 두 경로가 규칙을 따로 두면 한쪽으로 들어온 값이
     다른 쪽 검사를 비웃게 되고, 화면을 죽이는 값이 파일 경유로 들어온다. */
  const violation = checkAboutContent(payload);
  if (violation) {
    console.error(`✖ ${violation}`);
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log(`\n[dry] ${changedPaths.join(", ")} 를 쓸 예정 — delta 최상위 키: ${Object.keys(payload.delta).join(", ")}`);
    console.log(`[dry] DB 는 건드리지 않았습니다${warningCount ? ` (경고 ${warningCount}건)` : ""}`);
    return;
  }

  const { error } = await supabase!
    .from("site_settings")
    .update({ config: payload, updated_at: new Date().toISOString() })
    .eq("id", "default");
  if (error) {
    console.error(`✖ 저장 실패 — ${error.message}`);
    process.exit(1);
  }
  console.log(`\n✔ ${changedPaths.join(", ")} 저장 완료${warningCount ? ` (경고 ${warningCount}건)` : ""}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

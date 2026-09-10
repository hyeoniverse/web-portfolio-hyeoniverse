/**
 * content/about/**\/*.md → src/data/generated/aboutContent.ts (빌드 전 생성)
 *
 * 사용법:
 *   npx tsx scripts/gen-about-fallback.ts
 *   npx tsx scripts/gen-about-fallback.ts --check   # 파일이 최신인지만 확인 (CI 용)
 *
 * 왜 필요한가
 *   About 패널은 세 단계로 값을 고른다 — DB(동기화 결과) → 폴백 → 빈값.
 *   폴백이 손으로 쓴 TS 였는데, md 가 원본이 되면서 같은 글이 두 군데 살게 됐다.
 *   실제로 `data/about/security.ts`(9개)와 `site.config.about.security`(8개)가
 *   이미 어긋나 있었고 아무도 몰랐다 — 앞의 것이 도달하지 않는 코드였기 때문이다.
 *
 *   그래서 폴백을 사람이 쓰지 않고 md 에서 굽는다. 손으로 고치는 원본은 md 하나뿐이다.
 *
 * 런타임에 파일을 읽지 않는 이유
 *   배포된 서버에는 repo 가 없다. 빌드 산출물만 돈다. 그래서 빌드 시점에 넣는다.
 *   DB 가 없어도 About 이 내용을 갖고 뜨고, md 도 없으면 빈값이 된다 — 아직 아무것도
 *   쓰지 않았다는 뜻이라 그게 맞다.
 */

import fs from "node:fs";
import path from "node:path";
import { parseDecisionMarkdown, mergeDecisionPair } from "@/lib/about/decisionsMarkdown";
import {
  parseSimpleMarkdown, securityPanel, featuresPanel, processPanel,
  overviewPanel, type SimpleDoc,
} from "@/lib/about/panelMarkdown";
import { MARKDOWN_PANELS } from "@/lib/about/contentSources";

const CHECK = process.argv.includes("--check");
const ROOT = path.resolve(process.cwd(), "content/about");
const OUT = path.resolve(process.cwd(), "src/data/generated/aboutContent.ts");

/** 이미지 상대 경로 → 서빙 경로. sync-about 과 같은 규칙. */
function rewriteAssets(raw: string, dir: string): string {
  return raw.replace(/!\[([^\]]*)\]\((\.\/[^)]+)\)/g, (_a, alt: string, rel: string) => {
    const clean = rel.replace(/^\.\//, "");
    return `![${alt}](/content/about/${dir}/${clean})`;
  });
}

interface Pair { base: string; ko: string; en?: string }

function readDir(dir: string): Pair[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs)
    .filter((n) => n.endsWith(".md") && !n.endsWith(".en.md"))
    .sort()
    .map((n) => {
      const base = n.slice(0, -3);
      const enPath = path.join(abs, `${base}.en.md`);
      return {
        base,
        ko: rewriteAssets(fs.readFileSync(path.join(abs, n), "utf8"), dir),
        en: fs.existsSync(enPath) ? rewriteAssets(fs.readFileSync(enPath, "utf8"), dir) : undefined,
      };
    });
}

function readSingle(name: string): { ko: SimpleDoc; en?: SimpleDoc } | null {
  const koPath = path.join(ROOT, `${name}.md`);
  if (!fs.existsSync(koPath)) return null;
  const enPath = path.join(ROOT, `${name}.en.md`);
  const opts = { optionalBody: true };
  return {
    ko: parseSimpleMarkdown(fs.readFileSync(koPath, "utf8"), opts),
    en: fs.existsSync(enPath) ? parseSimpleMarkdown(fs.readFileSync(enPath, "utf8"), opts) : undefined,
  };
}

function build(): string {
  const decisions = readDir(MARKDOWN_PANELS.troubleshooting.dir).map((p) =>
    mergeDecisionPair(
      parseDecisionMarkdown(p.ko, p.base.replace(/^\d+[-_]/, "")),
      p.en ? parseDecisionMarkdown(p.en, p.base.replace(/^\d+[-_]/, "")) : undefined,
    ),
  );

  const list = <T,>(dir: string, read: (ko: SimpleDoc, en?: SimpleDoc) => T): T[] =>
    readDir(dir).map((p) =>
      read(parseSimpleMarkdown(p.ko), p.en ? parseSimpleMarkdown(p.en) : undefined),
    );

  const security = list(MARKDOWN_PANELS.security.dir, securityPanel.read);
  const features = list(MARKDOWN_PANELS.features.dir, featuresPanel.read);
  const process_ = list(MARKDOWN_PANELS.process.dir, processPanel.read);

  const ov = readSingle(MARKDOWN_PANELS.overview.dir);
  const overview = ov ? overviewPanel.read(ov.ko, ov.en) : null;

  const json = (v: unknown) => JSON.stringify(v, null, 2);

  return `/* 자동 생성 — 고치지 마세요. 원본은 content/about/ 의 .md 입니다.
 * 다시 만들려면: npx tsx scripts/gen-about-fallback.ts (prebuild·dev 가 자동 실행)
 *
 * About 패널의 폴백. DB(동기화 결과)가 있으면 그게 이기고, 여기도 비어 있으면 화면이 빈다 —
 * 아직 아무것도 쓰지 않았다는 뜻이다. */
import type { TroubleShootingItem } from "@/data/about/types";
import type { CfgSecurity, CfgFeature, CfgProcess, OverviewValues } from "@/lib/about/panelMarkdown";

export const aboutDecisions: TroubleShootingItem[] = ${json(decisions)};

export const aboutSecurity: CfgSecurity[] = ${json(security)};

export const aboutFeatures: CfgFeature[] = ${json(features)};

export const aboutProcess: CfgProcess[] = ${json(process_)};

export const aboutOverview: OverviewValues | null = ${json(overview)};
`;
}

const next = build();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";

if (CHECK) {
  if (prev !== next) {
    console.error("✖ src/data/generated/aboutContent.ts 가 content/about/ 와 어긋납니다 — gen-about-fallback 을 돌리고 커밋하세요.");
    process.exit(1);
  }
  console.log("✔ About 폴백이 최신입니다");
} else if (prev === next) {
  console.log("📄 About 폴백 — 변경 없음");
} else {
  fs.writeFileSync(OUT, next, "utf8");
  console.log(`📄 About 폴백 생성 — ${path.relative(process.cwd(), OUT)}`);
}

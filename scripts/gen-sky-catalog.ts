/**
 * d3-celestial 의 별 · 별자리 데이터 → src/data/generated/skyCatalog.ts (손으로 한 번 돌려 결과를 커밋한다)
 *
 * 사용법:
 *   d3-celestial 저장소(https://github.com/ofrohn/d3-celestial)의 data 폴더를 받아 두고
 *   npx tsx scripts/gen-sky-catalog.ts <data 폴더>
 *
 * 무엇을 고르나
 *   - 별: 맨눈으로 잘 보이는 4.5 등급까지(약 900개). 위치(J2000 적경 · 적위)와 등급만
 *   - 별자리: IAU 88 별자리의 선(뱀주인자리 곁의 뱀자리는 두 조각이라 89개)과 이름 자리, 한국어 · 영어 이름, 중요도(rank 1~3)
 *   - 별 이름: 1.6 등급까지의 밝은 별(시리우스 · 베가 …)의 한국어 · 영어 이름
 *
 * 런타임에 받지 않는 이유 — 외부 요청 없이 첫 그림부터 그리고, 데이터가 바뀔 일이 없다(J2000 고정)
 */

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("d3-celestial data 폴더를 넘겨 주세요");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));

const MAG_LIMIT = 4.5;
const NAME_MAG_LIMIT = 1.6;
/** 경도(-180~180°) → 적경(시) */
const raH = (lon: number) => +((((lon % 360) + 360) % 360) / 15).toFixed(4);
const r2 = (n: number) => +n.toFixed(2);

type Feature<P, G> = { id: string | number; properties: P; geometry: G };
const stars: Feature<{ mag: number }, { coordinates: [number, number] }>[] = read("stars.6.json").features;
const lines: Feature<unknown, { coordinates: [number, number][][] }>[] = read("constellations.lines.json").features;
const names: Feature<{ ko: string; la: string; rank: string; display: [number, number, number] }, unknown>[] = read("constellations.json").features;
const starNames: Record<string, { name?: string; ko?: string }> = read("starnames.json");

const bright = stars.filter((s) => s.properties.mag <= MAG_LIMIT);
const flat: number[] = [];
for (const s of bright) flat.push(raH(s.geometry.coordinates[0]), r2(s.geometry.coordinates[1]), r2(s.properties.mag));

const cons = lines.map((l) => {
  const n = names.find((x) => x.id === l.id);
  if (!n) throw new Error(`이름 없는 별자리 ${l.id}`);
  return {
    id: String(l.id),
    ko: n.properties.ko,
    /* 영어 화면은 학명(Orion · Taurus · Cetus) — 영어 풀이 이름(Whale · Bull)보다 널리 쓴다 */
    en: n.properties.la,
    rank: Number(n.properties.rank),
    label: [raH(n.properties.display[0]), r2(n.properties.display[1])],
    lines: l.geometry.coordinates.map((poly) => poly.flatMap(([lon, lat]) => [raH(lon), r2(lat)])),
  };
});

const named = stars
  .filter((s) => s.properties.mag <= NAME_MAG_LIMIT && starNames[String(s.id)]?.name)
  .map((s) => {
    const n = starNames[String(s.id)];
    return { ra: raH(s.geometry.coordinates[0]), dec: r2(s.geometry.coordinates[1]), en: n.name!, ko: n.ko || n.name! };
  });

const license = fs.readFileSync(path.join(dir, "..", "LICENSE"), "utf8").trim().replace(/\*\//g, "* /");
const out = `/* 자동 생성 — scripts/gen-sky-catalog.ts. 손으로 고치지 마세요.
   별 ${bright.length}개(${MAG_LIMIT} 등급까지) · 별자리 ${cons.length}개 · 별 이름 ${named.length}개. 좌표는 J2000 적경(시) · 적위(도).

   데이터 출처: d3-celestial (https://github.com/ofrohn/d3-celestial) — XHIP(Hipparcos 확장 목록), IAU 별자리, Stellarium 별 이름 번역.
${license.split("\n").map((l) => `   ${l}`.trimEnd()).join("\n")}
*/

/** [적경(시), 적위(도), 등급] 을 이어 붙인 배열 — 세 칸씩 별 하나 */
export const SKY_STARS: number[] = ${JSON.stringify(flat)};

export interface SkyConstellation {
  id: string;
  ko: string;
  en: string;
  /** 1 = 잘 알려진 큰 별자리 · 3 = 작고 희미한 별자리 */
  rank: number;
  /** 이름을 놓을 자리 [적경(시), 적위(도)] */
  label: [number, number];
  /** 선 — 꺾은선마다 [적경, 적위, 적경, 적위, …] */
  lines: number[][];
}

export const SKY_CONSTELLATIONS: SkyConstellation[] = ${JSON.stringify(cons)};

/** 밝은 별 이름 */
export const SKY_STAR_NAMES: { ra: number; dec: number; ko: string; en: string }[] = ${JSON.stringify(named)};
`;
const OUT = path.resolve(process.cwd(), "src/data/generated/skyCatalog.ts");
fs.writeFileSync(OUT, out);
console.log(`[gen-sky-catalog] ${path.relative(process.cwd(), OUT)} — 별 ${bright.length} · 별자리 ${cons.length} · 이름 ${named.length} · ${(out.length / 1024).toFixed(1)}KB`);

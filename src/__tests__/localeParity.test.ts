import { describe, it, expect } from "vitest";
import ko from "@/locales/ko.json";
import en from "@/locales/en.json";
import koAdmin from "@/locales/ko.admin.json";
import enAdmin from "@/locales/en.admin.json";

/* 한국어와 영어 문구 파일이 같은 키를 갖고, 같은 키의 {{자리}} 이름이 같은지 본다.
   한쪽에만 있는 키는 다른 언어 화면에서 키 이름이 그대로 보이고, 자리 이름이 다르면 값이 채워지지 않는다.
   관리자 문구는 설정·게시물·공통만 본다 — dashboard 에는 한국어에만 남은 옛 키가 있다. */

type Tree = { [k: string]: string | Tree };
const flatten = (o: Tree, pre = ""): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[pre + k, v] as [string, string]] : flatten(v, `${pre}${k}.`)));
const holes = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(",");

const pairs: [name: string, a: Tree, b: Tree][] = [
  ["ko.json · en.json", ko as Tree, en as Tree],
  ...(["settings", "posts", "common"] as const).map((ns): [string, Tree, Tree] => [
    `admin.${ns}`,
    (koAdmin.admin as unknown as Record<string, Tree>)[ns],
    (enAdmin.admin as unknown as Record<string, Tree>)[ns],
  ]),
];

describe("문구 파일의 한국어·영어 짝", () => {
  it.each(pairs)("%s: 키가 같다", (_, a, b) => {
    expect(flatten(a).map(([k]) => k).sort()).toEqual(flatten(b).map(([k]) => k).sort());
  });

  it.each(pairs)("%s: 같은 키의 {{자리}} 이름이 같다", (_, a, b) => {
    const enMap = new Map(flatten(b));
    const diff = flatten(a).filter(([k, v]) => enMap.has(k) && holes(v) !== holes(enMap.get(k)!)).map(([k]) => k);
    expect(diff).toEqual([]);
  });
});

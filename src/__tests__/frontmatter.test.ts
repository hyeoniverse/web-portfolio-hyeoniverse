import { describe, it, expect } from "vitest";
import { parseFrontmatter, asArray, asInt, asBool } from "@/lib/frontmatter";

describe("parseFrontmatter", () => {
  it("머리말이 없으면 본문을 그대로 돌려준다", () => {
    const { meta, body } = parseFrontmatter("# 제목\n\n본문");
    expect(meta).toEqual({});
    expect(body).toBe("# 제목\n\n본문");
  });

  it("머리말을 걷어내고 키를 읽는다", () => {
    const { meta, body } = parseFrontmatter("---\nid: role-stored\nsection: 인증 / 인가\n---\n# 제목\n");
    expect(meta).toEqual({ id: "role-stored", section: "인증 / 인가" });
    expect(body).toBe("# 제목\n");
  });

  it("한 줄 배열과 빈 배열을 읽는다", () => {
    const { meta } = parseFrontmatter('---\ntags: [auth, "jwt", \'rls\']\nempty: []\n---\n');
    expect(meta.tags).toEqual(["auth", "jwt", "rls"]);
    expect(meta.empty).toEqual([]);
  });

  it("앞뒤 따옴표만 벗기고 본문 안 따옴표는 두 채로 남긴다", () => {
    const { meta } = parseFrontmatter('---\ntitle: "그가 \\"안 된다\\" 고 했다"\n---\n');
    expect(meta.title).toBe('그가 \\"안 된다\\" 고 했다');
  });

  /* 값에 콜론이 들어가는 제목이 흔하다 — 첫 콜론에서만 잘라야 뒤가 살아남는다. */
  it("값 안의 콜론을 자르지 않는다", () => {
    const { meta } = parseFrontmatter("---\ntitle: 인가: 코드에서 규칙으로\n---\n");
    expect(meta.title).toBe("인가: 코드에서 규칙으로");
  });

  it("키 형식이 아닌 줄은 건너뛴다", () => {
    const { meta } = parseFrontmatter("---\n# 주석\n\nid: ok\n---\n");
    expect(meta).toEqual({ id: "ok" });
  });

  /* 파일 첫 줄이 아니면 머리말이 아니다 — 본문 중간의 `---` 를 잘라내면 안 된다. */
  it("본문 중간의 구분선을 머리말로 보지 않는다", () => {
    const raw = "# 제목\n\n---\nid: 아님\n---\n";
    const { meta, body } = parseFrontmatter(raw);
    expect(meta).toEqual({});
    expect(body).toBe(raw);
  });
});

describe("값 변환", () => {
  it("asArray 는 단일 값도 배열로 받는다", () => {
    expect(asArray("auth")).toEqual(["auth"]);
    expect(asArray(["a", "b"])).toEqual(["a", "b"]);
    expect(asArray(undefined)).toEqual([]);
  });

  it("asInt 는 범위 밖·정수 아님·배열을 전부 undefined 로 떨어뜨린다", () => {
    expect(asInt("2", 1, 3)).toBe(2);
    expect(asInt("4", 1, 3)).toBeUndefined();
    expect(asInt("1.5", 1, 3)).toBeUndefined();
    expect(asInt("보통", 1, 3)).toBeUndefined();
    expect(asInt(["2"], 1, 3)).toBeUndefined();
  });

  it("asBool 은 표기 여러 개를 받고 나머지는 undefined", () => {
    expect(asBool("true")).toBe(true);
    expect(asBool("YES")).toBe(true);
    expect(asBool("0")).toBe(false);
    expect(asBool("off")).toBe(false);
    expect(asBool("아마도")).toBeUndefined();
    expect(asBool(undefined)).toBeUndefined();
  });
});

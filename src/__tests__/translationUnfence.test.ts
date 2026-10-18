import { describe, expect, it } from "vitest";
import { unfence } from "@/lib/api/translationProviders";

describe("번역 응답 울타리 벗기기", () => {
  it("응답 전체를 감싼 ```json 울타리를 벗긴다", () => {
    expect(JSON.parse(unfence('```json\n{ "a": "안녕" }\n```'))).toEqual({ a: "안녕" });
    expect(JSON.parse(unfence('  ```\n{"a":"b"}\n```  '))).toEqual({ a: "b" });
  });

  it("울타리가 없으면 그대로 둔다", () => {
    expect(unfence('{"a":"b"}')).toBe('{"a":"b"}');
  });

  it("값 안의 코드 블록은 건드리지 않는다", () => {
    const inner = { a: "예시\n```ts\nconst x = 1;\n```\n끝" };
    expect(JSON.parse(unfence("```json\n" + JSON.stringify(inner) + "\n```"))).toEqual(inner);
    expect(JSON.parse(unfence(JSON.stringify(inner)))).toEqual(inner);
  });
});

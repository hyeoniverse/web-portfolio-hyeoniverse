import { describe, expect, it } from "vitest";
import { TTS_VOICES, parseVoice, voicesFor } from "@/lib/ttsVoices";

describe("ttsVoices — 편집 언어마다 목소리", () => {
  it("그 언어의 Fish 목소리와 Google·Edge 만 보인다", () => {
    const ko = voicesFor("ko");
    const en = voicesFor("en");
    expect(ko.filter((v) => en.includes(v))).toEqual(["google:female", "google:male", "edge:female", "edge:male"]);
    expect(new Set([...ko, ...en])).toEqual(new Set(TTS_VOICES));
  });

  it("한국어 Fish 목소리로 영어 대본을 만들면 같은 성별의 영어 Fish 목소리를 쓴다", () => {
    const koMale = voicesFor("ko").find((v) => v.startsWith("fish:") && parseVoice(v).gender === "male")!;
    const parsed = parseVoice(koMale, "en");
    expect(parsed.gender).toBe("male");
    expect(voicesFor("en")).toContain(`fish:${parsed.fishId}`);
    expect(parseVoice(koMale, "ko").fishId).toBe(koMale.slice(5));
  });

  it("Google·Edge 에서 Fish 로 넘어가면 그 언어의 Fish 목소리", () => {
    expect(voicesFor("en")).toContain(`fish:${parseVoice("google:female", "en").fishId}`);
    expect(voicesFor("ko")).toContain(`fish:${parseVoice("edge:male", "ko").fishId}`);
  });
});

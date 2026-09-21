import { describe, it, expect } from "vitest";
import { resolvePartPath, notesPathOf, notesTextFromXml } from "@/lib/pptxNotes";
import { pickVoice, splitForSpeech, speechLangOf } from "@/lib/speech";
import { pcmToWav, pcmRateFromMime, wavToPcm } from "@/lib/wav";
import { chunkScript } from "@/lib/ttsChunks";
import { SIZE_OPTIONS, STORAGE_MAX_MB, BUILTIN_FORMATS } from "@/lib/uploadFormats";

/* 갤러리 슬라이드 음성 — PPTX 발표자 노트를 대본으로, TTS 음성은 WAV 로, 음성 파일이 없으면 브라우저가 읽는다. */

describe("PPTX 발표자 노트", () => {
  it("관계 target 을 슬라이드 기준 전체 경로로 편다", () => {
    expect(resolvePartPath("ppt/slides/slide3.xml", "../notesSlides/notesSlide7.xml")).toBe("ppt/notesSlides/notesSlide7.xml");
    expect(resolvePartPath("ppt/slides/slide3.xml", "/ppt/notesSlides/notesSlide1.xml")).toBe("ppt/notesSlides/notesSlide1.xml");
  });

  it("관계 목록에서 노트 파일을 찾는다 — 번호가 슬라이드와 달라도", () => {
    const rels = new Map([
      ["rId1", { type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout", target: "../slideLayouts/slideLayout2.xml" }],
      ["rId2", { type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide", target: "../notesSlides/notesSlide9.xml" }],
    ]);
    expect(notesPathOf("ppt/slides/slide2.xml", rels)).toBe("ppt/notesSlides/notesSlide9.xml");
    expect(notesPathOf("ppt/slides/slide2.xml", new Map())).toBeNull();
  });

  it("본문 자리의 글만 읽고 문단은 줄바꿈으로 잇는다 — 그림 자리·쪽 번호는 뺀다", () => {
    const xml = `<?xml version="1.0"?><p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>
      <p:sp><p:nvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr></p:sp>
      <p:sp><p:nvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:txBody>
        <a:p><a:r><a:t>큐알유를 </a:t></a:r><a:r><a:t>소개합니다.</a:t></a:r></a:p>
        <a:p><a:r><a:t>QR 하나로 명함을 만듭니다.</a:t></a:r></a:p>
      </p:txBody></p:sp>
      <p:sp><p:nvSpPr><p:nvPr><p:ph type="sldNum" idx="5"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>3</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree></p:cSld></p:notes>`;
    expect(notesTextFromXml(xml)).toBe("큐알유를 소개합니다.\nQR 하나로 명함을 만듭니다.");
  });
});

describe("브라우저 음성(대체)", () => {
  const v = (name: string, lang: string) => ({ name, lang }) as SpeechSynthesisVoice;

  it("한글이 있으면 한국어로 읽는다", () => {
    expect(speechLangOf("안녕하세요 QRU")).toBe("ko-KR");
    expect(speechLangOf("Hello QRU")).toBe("en-US");
  });

  it("같은 언어 가운데 자연스러운 목소리를 고른다 — 신경망 > Google > 향상", () => {
    const voices = [v("Yuna", "ko-KR"), v("Google 한국의", "ko-KR"), v("Microsoft SunHi Online (Natural) - Korean", "ko-KR"), v("Samantha", "en-US")];
    expect(pickVoice(voices, "ko-KR")?.name).toContain("Natural");
    expect(pickVoice([v("Yuna", "ko-KR"), v("Google 한국의", "ko-KR")], "ko-KR")?.name).toBe("Google 한국의");
    expect(pickVoice([v("Samantha", "en-US")], "ko-KR")).toBeNull();
  });

  it("문장 단위로 나눠 한 조각이 길어지지 않게 한다 — 크롬이 15초쯤에서 끊는다", () => {
    const parts = splitForSpeech("첫 문장입니다. 두 번째 문장이에요. 세 번째!\n네 번째 줄");
    expect(parts).toEqual(["첫 문장입니다.", "두 번째 문장이에요.", "세 번째!", "네 번째 줄"]);
    const long = "가".repeat(400);
    expect(splitForSpeech(long, 160).every((p) => p.length <= 160)).toBe(true);
  });
});

describe("TTS 음성 파일", () => {
  it("PCM 에 WAV 머리를 붙인다 — 표본율·길이가 머리에 적힌다", () => {
    const pcm = new Uint8Array(48000); // 24kHz 16비트 단일 채널 1초
    const wav = pcmToWav(pcm, 24000);
    const view = new DataView(wav.buffer);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe("WAVE");
    expect(view.getUint32(24, true)).toBe(24000);
    expect(view.getUint32(40, true)).toBe(48000);
    expect(wav.length).toBe(48044);
  });

  it("WAV 에서 PCM 을 도로 꺼낸다 — 조각을 이어 붙일 때", () => {
    const pcm = new Uint8Array([1, 2, 3, 4, 5, 6]);
    const back = wavToPcm(pcmToWav(pcm, 24000));
    expect(back?.sampleRate).toBe(24000);
    expect(Array.from(back?.pcm ?? [])).toEqual([1, 2, 3, 4, 5, 6]);
    expect(wavToPcm(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it("MIME 에서 표본율을 읽는다", () => {
    expect(pcmRateFromMime("audio/L16;codec=pcm;rate=24000")).toBe(24000);
    expect(pcmRateFromMime(undefined)).toBe(24000);
  });
});

describe("업로드 형식 설정", () => {
  it("크기 선택지는 저장소 한도(50MB)를 넘지 않는다", () => {
    expect(Math.max(...SIZE_OPTIONS.map((o) => Number(o.value)))).toBe(STORAGE_MAX_MB);
  });

  it("PPT 는 기본 형식이고 PPTX 바로 옆에 있다", () => {
    const exts = BUILTIN_FORMATS.map((f) => f.ext);
    expect(exts.indexOf("ppt")).toBe(exts.indexOf("pptx") + 1);
  });
});

describe("긴 대본 나누기", () => {
  it("짧으면 한 조각, 길면 문장 경계에서 상한 이하로 나눈다", () => {
    expect(chunkScript("짧은 대본입니다.")).toEqual(["짧은 대본입니다."]);
    const sentence = "큐알유는 QR 코드 하나로 디지털 명함을 만드는 서비스입니다.";
    const long = Array.from({ length: 40 }, () => sentence).join(" ");
    const parts = chunkScript(long, 600);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= 600)).toBe(true);
    expect(parts.every((p) => p.endsWith("다."))).toBe(true);
    expect(parts.join(" ")).toBe(long);
  });
});

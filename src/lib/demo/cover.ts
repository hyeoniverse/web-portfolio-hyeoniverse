import sharp from "sharp";
import { InferenceClient, InferenceClientProviderApiError, InferenceClientProviderOutputError } from "@huggingface/inference";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getSecret } from "@/lib/getSecret";
import { ProviderError, classifyFailure, filterEnabled, missingKey, recordFailure, recordOk, toProviderError } from "@/lib/ai/health";
import type { ProviderFailure } from "@/lib/ai/providers";
import { hfModel, nanoBananaModel } from "@/lib/ai/models";
import { DemoInputError, demoText } from "@/lib/demo/input";
import { allUnavailable, anyProviderUsable, providerLabel, publicFailures, type DemoOutcome } from "@/lib/demo/handler";

/**
 * 커버 데모 — 편집기의 AI 커버(/api/cover/ai-generate)와 같은 스타일 · 같은 프롬프트 · 같은 공급자 순서(설정 › 서비스 › AI 커버)로
 * 그린다. 그 라우트는 로그인과 스토리지 업로드가 붙어 있어 생성 부분만 여기에 옮겼다(내용은 같다 — 고치면 두 곳을 같이).
 * 버킷에 올리지 않고 줄인 JPEG 을 data URL 로 바로 돌려준다. 공급자 상태 · 사용량(ai_usage)은 같은 방식으로 남긴다.
 */
export const COVER_PROMPT_MAX = 300;

export const COVER_STYLES: Record<string, string> = {
  abstract: "abstract art style, flowing shapes and colors",
  minimal: "minimalist design, clean lines, simple composition",
  geometric: "geometric patterns, bold shapes, modern design",
  photographic: "high quality photograph, cinematic lighting",
  illustration: "digital illustration, hand-drawn feel, vibrant colors",
  watercolor: "soft watercolor painting, gentle color bleeding, artistic texture",
  cyberpunk: "cyberpunk neon glow, dark futuristic atmosphere, high contrast",
  vintage: "vintage retro aesthetic, muted warm tones, film grain texture",
  "3d-render": "3D rendered scene, soft lighting, glossy materials, depth of field",
  "flat-design": "flat design, bold solid colors, no shadows, vector art style",
};

export interface CoverInput {
  prompt: string;
  style: string;
}

export function parseCover(body: Record<string, unknown>): CoverInput {
  const prompt = demoText(body.prompt, { max: COVER_PROMPT_MAX, empty: "그릴 내용을 써 주세요.", refused: "이 내용으로는 그려 드릴 수 없습니다." });
  const style = body.style === undefined || body.style === null || body.style === "" ? "abstract" : body.style;
  if (typeof style !== "string" || !Object.hasOwn(COVER_STYLES, style)) throw new DemoInputError("고를 수 없는 스타일입니다.");
  return { prompt, style };
}

export async function coverUnavailable(): Promise<string | null> {
  const config = await getSiteConfig();
  return config?.aiCover?.enabled === false ? "지금은 AI 커버 기능을 쓸 수 없습니다." : null;
}

// ── NanoBanana ── (api/cover/ai-generate 와 같다)
const NANOBANANA_ENDPOINT = {
  nanobanana: { path: "generate", body: { type: "TEXTTOIAMGE", numImages: 1, image_size: "16:9" } },
  "nanobanana-2": { path: "generate-2", body: { aspectRatio: "16:9", resolution: "2K", outputFormat: "jpg" } },
  "nanobanana-pro": { path: "generate-pro", body: { aspectRatio: "16:9", resolution: "2K" } },
} as const;

async function generateWithNanoBanana(fullPrompt: string): Promise<ArrayBuffer> {
  const apiKey = await getSecret("NANOBANANA_API_KEY");
  if (!apiKey) throw missingKey("nanobanana", "NANOBANANA_API_KEY");
  const ep = NANOBANANA_ENDPOINT[await nanoBananaModel()];

  const createRes = await fetch(`https://api.nanobananaapi.ai/api/v1/nanobanana/${ep.path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ prompt: fullPrompt, ...ep.body }),
  });
  const createData = await createRes.json().catch(() => ({}));
  if (createData.code !== 200) {
    /* NanoBanana 는 HTTP 200 안의 code 로 실패를 알린다(401 키 · 402 크레딧 등) */
    const status = Number(createData.code) || createRes.status;
    const msg = createData.msg || "NanoBanana generation request failed";
    throw new ProviderError("nanobanana", classifyFailure(status, msg), `${status} ${msg}`, status);
  }
  const taskId = createData.data?.taskId;
  if (!taskId) throw new Error("No taskId returned");

  /* 폴링으로 결과 대기(최대 120초) */
  const start = Date.now();
  while (Date.now() - start < 120_000) {
    await new Promise((r) => setTimeout(r, 3_000));
    const statusRes = await fetch(`https://api.nanobananaapi.ai/api/v1/nanobanana/record-info?taskId=${taskId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const statusData = await statusRes.json();
    const resultUrl = statusData.data?.response?.resultImageUrl || statusData.data?.info?.resultImageUrl;
    if (statusData.data?.successFlag === 1 && resultUrl) {
      const imgRes = await fetch(resultUrl, { signal: AbortSignal.timeout(30000) });
      if (!imgRes.ok) throw new Error("Failed to download generated image");
      return imgRes.arrayBuffer();
    }
    if (statusData.code && statusData.code >= 400) throw new Error(statusData.msg || "NanoBanana generation failed");
  }
  throw new Error("NanoBanana generation timed out");
}

// ── Hugging Face ── (api/cover/ai-generate 와 같다 — provider: "auto" 로 모델의 살아 있는 공급자에게)
async function generateWithHuggingFace(fullPrompt: string): Promise<ArrayBuffer> {
  const apiKey = await getSecret("HUGGINGFACE_API_KEY");
  if (!apiKey) throw missingKey("huggingface", "HUGGINGFACE_API_KEY");
  const model = await hfModel();
  const client = new InferenceClient(apiKey);
  try {
    const blob = await client.textToImage(
      { model, provider: "auto", inputs: fullPrompt, parameters: { width: 1792, height: 1024 } },
      { outputType: "blob", signal: AbortSignal.timeout(60000) },
    );
    return blob.arrayBuffer();
  } catch (e) {
    if (e instanceof InferenceClientProviderApiError) {
      const status = e.httpResponse.status;
      const msg = `${model}: ${String(e.httpResponse.body ?? e.message).slice(0, 200)}`;
      throw new ProviderError("huggingface", classifyFailure(status, msg), `${status} ${msg}`, status);
    }
    if (e instanceof InferenceClientProviderOutputError) throw new Error(`${model}: ${e.message}`);
    throw e;
  }
}

type CoverProvider = "nanobanana" | "huggingface";

/** 응답에 바로 실을 크기로 — 2K 원본은 data URL 로 수 MB 라 1280px JPEG 으로 줄인다 */
async function toDataUrl(buf: ArrayBuffer): Promise<string> {
  try {
    const out = await sharp(Buffer.from(buf)).resize({ width: 1280, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    /* 줄이지 못하면 원본 그대로 — 브라우저는 이미지 형식을 내용으로 가른다 */
    return `data:image/jpeg;base64,${Buffer.from(buf).toString("base64")}`;
  }
}

/** 설정 › 서비스 › AI 커버의 공급자 순서(기본 + 대체) */
async function coverOrder(): Promise<CoverProvider[]> {
  const config = await getSiteConfig();
  const primary: CoverProvider = (config?.aiCover?.provider as CoverProvider) ?? "nanobanana";
  const fallbackCfg = config?.aiCover?.fallback;
  const configured: CoverProvider[] = [primary];
  if (fallbackCfg?.enabled && fallbackCfg.priority?.length) {
    const excl = new Set(fallbackCfg.excluded ?? []);
    for (const p of fallbackCfg.priority) if (p !== primary && !excl.has(p)) configured.push(p as CoverProvider);
  }
  return configured;
}

/** 지금 쓸 수 있나 — 꺼 두지 않았고, 부를 공급자가 있다 */
export async function coverUsable(): Promise<boolean> {
  return !(await coverUnavailable()) && anyProviderUsable(await coverOrder());
}

export async function runCover({ prompt, style }: CoverInput): Promise<DemoOutcome<{ image: string; provider: string }>> {
  const fullPrompt = `Blog cover image: ${prompt}. Style: ${COVER_STYLES[style]}. Wide landscape format, no text.`;
  const configured = await coverOrder();
  /* 여러 번 이어 실패해 꺼 둔 공급자는 부르지 않는다(lib/ai/health) */
  const { enabled, skipped } = await filterEnabled(configured, (p) => p);
  const failures: ProviderFailure[] = [...skipped];

  for (const provider of enabled) {
    let buf: ArrayBuffer;
    try {
      buf = provider === "nanobanana" ? await generateWithNanoBanana(fullPrompt) : await generateWithHuggingFace(fullPrompt);
      await recordOk(provider);
    } catch (e) {
      const err = toProviderError(provider, e);
      failures.push(await recordFailure(err));
      console.error("[demo/cover]", provider, err.kind);
      continue;
    }
    return { ok: true, data: { image: await toDataUrl(buf), provider: providerLabel(provider) } };
  }

  return allUnavailable(failures)
    ? { ok: false, status: 503, message: "지금은 AI 커버 기능을 쓸 수 없습니다.", failures: publicFailures(failures) }
    : { ok: false, status: 502, message: "커버를 그리지 못했습니다. 잠시 뒤 다시 시도해 주세요.", failures: publicFailures(failures) };
}

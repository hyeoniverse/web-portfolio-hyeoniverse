import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getSecret } from "@/lib/getSecret";
import { ProviderError, classifyFailure, filterEnabled, missingKey, recordFailure, recordOk, toProviderError } from "@/lib/ai/health";
import type { ProviderFailure } from "@/lib/ai/providers";
import { hfModel, nanoBananaModel } from "@/lib/ai/models";
import { InferenceClient, InferenceClientProviderApiError, InferenceClientProviderOutputError } from "@huggingface/inference";

const stylePrompts: Record<string, string> = {
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

// ── Provider: NanoBanana ──
// 모델은 엔드포인트가 가른다(설정 › 서비스 › AI 모델): generate(원본) · generate-2(최신) · generate-pro. 결과는 셋 다 record-info 로 받는다.
const NANOBANANA_ENDPOINT = {
  nanobanana: { path: "generate", body: { type: "TEXTTOIAMGE", numImages: 1, image_size: "16:9" } },
  "nanobanana-2": { path: "generate-2", body: { aspectRatio: "16:9", resolution: "2K", outputFormat: "jpg" } },
  "nanobanana-pro": { path: "generate-pro", body: { aspectRatio: "16:9", resolution: "2K" } },
} as const;

async function generateWithNanoBanana(fullPrompt: string): Promise<ArrayBuffer> {
  const apiKey = await getSecret("NANOBANANA_API_KEY");
  if (!apiKey) throw missingKey("nanobanana", "NANOBANANA_API_KEY");
  const ep = NANOBANANA_ENDPOINT[await nanoBananaModel()];

  // 1. 생성 요청
  const createRes = await fetch(
    `https://api.nanobananaapi.ai/api/v1/nanobanana/${ep.path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prompt: fullPrompt, ...ep.body }),
    }
  );

  const createData = await createRes.json().catch(() => ({}));
  if (createData.code !== 200) {
    /* NanoBanana 는 HTTP 200 안의 code 로 실패를 알린다(401 키·402 크레딧 등) — 그 code 로 원인을 가른다 */
    const status = Number(createData.code) || createRes.status;
    const msg = createData.msg || "NanoBanana generation request failed";
    throw new ProviderError("nanobanana", classifyFailure(status, msg), `${status} ${msg}`, status);
  }

  const taskId = createData.data?.taskId;
  if (!taskId) throw new Error("No taskId returned");

  // 2. 폴링으로 결과 대기 (최대 120초)
  const maxWait = 120_000;
  const interval = 3_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, interval));

    const statusRes = await fetch(
      `https://api.nanobananaapi.ai/api/v1/nanobanana/record-info?taskId=${taskId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const statusData = await statusRes.json();

    // 결과 이미지 URL 확인
    const resultUrl =
      statusData.data?.response?.resultImageUrl ||
      statusData.data?.info?.resultImageUrl;

    if (statusData.data?.successFlag === 1 && resultUrl) {
      const imgRes = await fetch(resultUrl, {
        signal: AbortSignal.timeout(30000),
      });
      if (!imgRes.ok) throw new Error("Failed to download generated image");
      return imgRes.arrayBuffer();
    }

    // 실패 상태
    if (statusData.code && statusData.code >= 400) {
      throw new Error(statusData.msg || "NanoBanana generation failed");
    }
  }

  throw new Error("NanoBanana generation timed out");
}

// ── Provider: Hugging Face ──
// hf-inference 하나에 묶지 않는다 — FLUX 류는 이제 fal-ai · nscale 같은 외부 공급자에서만 돌아서, 클라이언트가
// 모델의 공급자 매핑을 보고 살아 있는 쪽으로 보낸다(provider: "auto"). 모델은 설정(기본 "latest" = Hub 인기 1위).

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
    /* 공급자 응답(401 키 · 402 크레딧 · 404 모델 없음)은 상태 코드로 원인을 가른다. 본문에 토큰이 되돌아올 수 있어 앞부분만 */
    if (e instanceof InferenceClientProviderApiError) {
      const status = e.httpResponse.status;
      const msg = `${model}: ${String(e.httpResponse.body ?? e.message).slice(0, 200)}`;
      throw new ProviderError("huggingface", classifyFailure(status, msg), `${status} ${msg}`, status);
    }
    if (e instanceof InferenceClientProviderOutputError) throw new Error(`${model}: ${e.message}`);
    throw e;
  }
}

// ── Route Handler ──

export async function POST(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { prompt, style } = await request.json();

  if (!prompt) return jsonError("Prompt required", 400);
  // prompt 길이 가드 — provider 측 token-bomb 방지
  if (typeof prompt !== "string" || prompt.length > 500) {
    return jsonError("Prompt too long (max 500 chars)", 400, { code: "AI_PROMPT_TOO_LONG", params: { max: 500 } });
  }

  const styleHint = stylePrompts[style] || stylePrompts.abstract;
  const fullPrompt = `Blog cover image: ${prompt}. Style: ${styleHint}. Wide landscape format, no text.`;

  type Provider = "nanobanana" | "huggingface";
  const config = await getSiteConfig();
  const primary: Provider = (config?.aiCover?.provider as Provider) ?? "nanobanana";
  const fallbackCfg = config?.aiCover?.fallback;

  const configured: Provider[] = [primary];
  if (fallbackCfg?.enabled && fallbackCfg.priority?.length) {
    const excl = new Set(fallbackCfg.excluded ?? []);
    for (const p of fallbackCfg.priority) {
      if (p !== primary && !excl.has(p)) configured.push(p as Provider);
    }
  }
  /* 여러 번 이어 실패해 꺼 둔 공급자는 부르지 않는다(lib/ai/health) */
  const { enabled: providerList, skipped } = await filterEnabled(configured, (p) => p);
  const failures: ProviderFailure[] = [...skipped];

  async function callProvider(provider: Provider, prompt: string): Promise<ArrayBuffer> {
    switch (provider) {
      case "nanobanana": return generateWithNanoBanana(prompt);
      case "huggingface": return generateWithHuggingFace(prompt);
      default: throw new Error(`Unknown AI cover provider: ${provider}`);
    }
  }

  let lastError = skipped.length ? "All providers disabled" : "Unknown error";
  for (const provider of providerList) {
    let imgBuffer: ArrayBuffer;
    try {
      imgBuffer = await callProvider(provider, fullPrompt);
      await recordOk(provider);
    } catch (e) {
      const err = toProviderError(provider, e);
      lastError = err.message;
      failures.push(await recordFailure(err));
      console.error("[cover/ai-generate]", provider, err.kind, lastError);
      continue;
    }
    {

      const fileName = `${crypto.randomUUID()}.jpg`;
      const filePath = `posts/${fileName}`;

      const admin = createAdminClient();
      const { error } = await admin.storage
        .from("posts")
        .upload(filePath, imgBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) return jsonServerError(error, "POST /api/cover/ai-generate");

      const {
        data: { publicUrl },
      } = admin.storage.from("posts").getPublicUrl(filePath);

      /* 앞 공급자가 실패해 뒤 공급자로 만들었으면 failures 에 실어 화면이 알린다 */
      return jsonOk({ url: publicUrl, failures });
    }
  }

  const status = failures.length > 0 && failures.every((f) => f.kind === "no_key") ? 503 : 502;
  const code = status === 503 ? "AI_NOT_CONFIGURED" : failures.length > 0 && failures.every((f) => f.disabled) ? "AI_PROVIDERS_DISABLED" : "AI_GENERATE_FAILED";
  /* 제공자가 쓴 영어 문장은 로그·개발용 — 화면은 코드와 failures 로 문구를 고른다(#862) */
  return NextResponse.json({ error: sanitizeError(lastError), code, failures }, { status });
}

/** 에러 메시지에 섞여 있을 수 있는 API 토큰/key 패턴 마스킹 */
function sanitizeError(msg: string): string {
  return msg
    // hf_..., sk_..., nb_... 등 prefix_ 형태 토큰
    .replace(/\b[a-z]{2,4}_[A-Za-z0-9]{16,}/g, "[REDACTED]")
    // Bearer xxx
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    // Authorization 헤더 형태
    .replace(/Authorization:\s*[^\s,;}]+/gi, "Authorization: [REDACTED]")
    // 30자 이상 base64-ish 문자열 (일반적 API key 모양)
    .replace(/\b[A-Za-z0-9_-]{30,}\b/g, "[REDACTED]");
}

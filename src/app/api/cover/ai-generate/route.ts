import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getSecret } from "@/lib/getSecret";

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

async function generateWithNanoBanana(fullPrompt: string): Promise<ArrayBuffer> {
  const apiKey = await getSecret("NANOBANANA_API_KEY");
  if (!apiKey) throw new Error("NANOBANANA_API_KEY not configured");

  // 1. 생성 요청
  const createRes = await fetch(
    "https://api.nanobananaapi.ai/api/v1/nanobanana/generate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        type: "TEXTTOIAMGE",
        numImages: 1,
        image_size: "16:9",
      }),
    }
  );

  const createData = await createRes.json();
  if (createData.code !== 200) {
    throw new Error(createData.msg || "NanoBanana generation request failed");
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

async function generateWithHuggingFace(fullPrompt: string): Promise<ArrayBuffer> {
  const apiKey = await getSecret("HUGGINGFACE_API_KEY");
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY not configured");

  const model = "black-forest-labs/FLUX.1-schnell";

  const res = await fetch(
    `https://router.huggingface.co/hf-inference/models/${model}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: { width: 1792, height: 1024 },
      }),
      signal: AbortSignal.timeout(60000),
    }
  );

  if (!res.ok) {
    // 응답 본문에 토큰 echo 가능 — 클라이언트로 노출 금지. 서버 로그만 남기고 generic 메시지 반환
    const raw = await res.text().catch(() => "");
    console.error("[cover/ai-generate] HF error", res.status, raw.slice(0, 500));
    throw new Error(`Hugging Face error (${res.status})`);
  }

  return res.arrayBuffer();
}

// ── Route Handler ──

export async function POST(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { prompt, style } = await request.json();

  if (!prompt) return jsonError("Prompt required", 400);
  // prompt 길이 가드 — provider 측 token-bomb 방지
  if (typeof prompt !== "string" || prompt.length > 500) {
    return jsonError("Prompt too long (max 500 chars)", 400);
  }

  const styleHint = stylePrompts[style] || stylePrompts.abstract;
  const fullPrompt = `Blog cover image: ${prompt}. Style: ${styleHint}. Wide landscape format, no text.`;

  type Provider = "nanobanana" | "huggingface";
  const config = await getSiteConfig();
  const primary: Provider = (config?.aiCover?.provider as Provider) ?? "nanobanana";
  const fallbackCfg = config?.aiCover?.fallback;

  const providerList: Provider[] = [primary];
  if (fallbackCfg?.enabled && fallbackCfg.priority?.length) {
    const excl = new Set(fallbackCfg.excluded ?? []);
    for (const p of fallbackCfg.priority) {
      if (p !== primary && !excl.has(p)) providerList.push(p as Provider);
    }
  }

  async function callProvider(provider: Provider, prompt: string): Promise<ArrayBuffer> {
    switch (provider) {
      case "nanobanana": return generateWithNanoBanana(prompt);
      case "huggingface": return generateWithHuggingFace(prompt);
      default: throw new Error(`Unknown AI cover provider: ${provider}`);
    }
  }

  let lastError = "Unknown error";
  for (const provider of providerList) {
    try {
      const imgBuffer = await callProvider(provider, fullPrompt);

      const fileName = `${crypto.randomUUID()}.jpg`;
      const filePath = `posts/${fileName}`;

      const admin = createAdminClient();
      const { error } = await admin.storage
        .from("posts")
        .upload(filePath, imgBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) return jsonServerError(error);

      const {
        data: { publicUrl },
      } = admin.storage.from("posts").getPublicUrl(filePath);

      return jsonOk({ url: publicUrl });
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Unknown error";
      console.error("[cover/ai-generate]", provider, lastError);
    }
  }

  const status = lastError.includes("not configured") ? 503 : 502;
  return jsonError(sanitizeError(lastError), status);
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

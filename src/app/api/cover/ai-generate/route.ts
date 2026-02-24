import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteConfig } from "@/config/site.config";
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
    const text = await res.text().catch(() => "");
    throw new Error(`Hugging Face error (${res.status}): ${text.slice(0, 200)}`);
  }

  return res.arrayBuffer();
}

// ── Route Handler ──

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, style } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt required" }, { status: 400 });
  }

  const styleHint = stylePrompts[style] || stylePrompts.abstract;
  const fullPrompt = `Blog cover image: ${prompt}. Style: ${styleHint}. Wide landscape format, no text.`;

  const provider = siteConfig.aiCover.provider;

  try {
    let imgBuffer: ArrayBuffer;

    switch (provider) {
      case "nanobanana":
        imgBuffer = await generateWithNanoBanana(fullPrompt);
        break;
      case "huggingface":
        imgBuffer = await generateWithHuggingFace(fullPrompt);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown AI cover provider: ${provider}` },
          { status: 400 }
        );
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const filePath = `posts/${fileName}`;

    const admin = createAdminClient();
    const { error } = await admin.storage
      .from("posts")
      .upload(filePath, imgBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("posts").getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

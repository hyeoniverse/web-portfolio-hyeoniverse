import { NextResponse } from "next/server";
import { getSecret } from "@/lib/getSecret";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const MAX_LENGTH = 2000;

export async function POST(request: Request) {
  const { text, targetLang } = (await request.json()) as {
    text: string;
    targetLang: "ko" | "en";
  };

  if (!text?.trim() || !targetLang) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (text.length > MAX_LENGTH) {
    return NextResponse.json({ error: "Text too long" }, { status: 400 });
  }

  const apiKey = await getSecret("GEMINI_API_KEY");
  if (!apiKey) {
    return NextResponse.json({ error: "Translation not available" }, { status: 503 });
  }

  const targetName = targetLang === "ko" ? "Korean" : "English";

  const prompt = `Translate the following text to ${targetName}.
Return ONLY the translated text, nothing else.
Preserve line breaks and formatting.

Text:
${text}`;

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Translation error: ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const translated =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!translated) {
      return NextResponse.json({ error: "Empty translation" }, { status: 502 });
    }

    return NextResponse.json({ translation: translated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

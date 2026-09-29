import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { getSecret } from "@/lib/getSecret";

export async function POST(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const accessKey = await getSecret("UNSPLASH_ACCESS_KEY");
  if (!accessKey) return jsonError("Unsplash API key not configured", 503, { code: "UNSPLASH_KEY_MISSING" });

  const { downloadUrl, regularUrl } = await request.json();

  if (!downloadUrl || !regularUrl) {
    return jsonError("downloadUrl and regularUrl required", 400);
  }
  /* 주소는 클라이언트가 보낸다 — 호스트를 묶지 않으면 아무 주소에나 Unsplash 키를 실어 보내고(키 유출),
     서버가 임의의 주소를 대신 받아 오게 된다. 추적 주소는 api.unsplash.com, 그림은 images.unsplash.com 만 */
  if (!isHost(downloadUrl, ["api.unsplash.com"]) || !isHost(regularUrl, ["images.unsplash.com", "plus.unsplash.com"])) {
    return jsonError("Unsplash URL required", 400);
  }

  // Trigger Unsplash download tracking (API policy requirement) — 추적 실패가 저장을 막지는 않는다
  await fetch(downloadUrl, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  }).catch(() => null);

  // Download the image
  const imgRes = await fetch(regularUrl);
  if (!imgRes.ok) return jsonError("Failed to download image", 502, { code: "COVER_DOWNLOAD_FAILED" });

  const imgBuffer = await imgRes.arrayBuffer();
  const fileName = `${crypto.randomUUID()}.jpg`;
  const filePath = `posts/${fileName}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from("posts").upload(filePath, imgBuffer, {
    contentType: "image/jpeg",
    upsert: false,
  });

  if (error) return jsonServerError(error, "POST /api/cover/unsplash/download");

  const {
    data: { publicUrl },
  } = admin.storage.from("posts").getPublicUrl(filePath);

  return jsonOk({ url: publicUrl });
}

function isHost(raw: unknown, hosts: string[]): boolean {
  if (typeof raw !== "string") return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && hosts.includes(u.hostname);
  } catch {
    return false;
  }
}

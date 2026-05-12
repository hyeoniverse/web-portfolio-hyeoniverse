import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { getSecret } from "@/lib/getSecret";

export async function POST(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const accessKey = await getSecret("UNSPLASH_ACCESS_KEY");
  if (!accessKey) return jsonError("Unsplash API key not configured", 503);

  const { downloadUrl, regularUrl } = await request.json();

  if (!downloadUrl || !regularUrl) {
    return jsonError("downloadUrl and regularUrl required", 400);
  }

  // Trigger Unsplash download tracking (API policy requirement)
  await fetch(downloadUrl, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  // Download the image
  const imgRes = await fetch(regularUrl);
  if (!imgRes.ok) return jsonError("Failed to download image", 502);

  const imgBuffer = await imgRes.arrayBuffer();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const filePath = `posts/${fileName}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from("posts").upload(filePath, imgBuffer, {
    contentType: "image/jpeg",
    upsert: false,
  });

  if (error) return jsonServerError(error);

  const {
    data: { publicUrl },
  } = admin.storage.from("posts").getPublicUrl(filePath);

  return jsonOk({ url: publicUrl });
}

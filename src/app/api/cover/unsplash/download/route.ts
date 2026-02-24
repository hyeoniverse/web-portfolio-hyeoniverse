import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSecret } from "@/lib/getSecret";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessKey = await getSecret("UNSPLASH_ACCESS_KEY");
  if (!accessKey) {
    return NextResponse.json(
      { error: "Unsplash API key not configured" },
      { status: 503 }
    );
  }

  const { downloadUrl, regularUrl } = await request.json();

  if (!downloadUrl || !regularUrl) {
    return NextResponse.json(
      { error: "downloadUrl and regularUrl required" },
      { status: 400 }
    );
  }

  // Trigger Unsplash download tracking (API policy requirement)
  await fetch(downloadUrl, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  // Download the image
  const imgRes = await fetch(regularUrl);
  if (!imgRes.ok) {
    return NextResponse.json(
      { error: "Failed to download image" },
      { status: 502 }
    );
  }

  const imgBuffer = await imgRes.arrayBuffer();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const filePath = `posts/${fileName}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from("posts").upload(filePath, imgBuffer, {
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
}

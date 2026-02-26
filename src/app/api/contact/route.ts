import { NextRequest, NextResponse } from "next/server";
import { getSecret } from "@/lib/getSecret";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const provider = body.get("_provider") as string;

    // 입력 검증
    const name = (body.get("name") as string || "").trim();
    const email = (body.get("email") as string || "").trim();
    const message = (body.get("message") as string || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, message: "All fields are required" }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ success: false, message: "Name too long" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ success: false, message: "Invalid email" }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ success: false, message: "Message too long" }, { status: 400 });
    }

    // 내부 필드 제거
    body.delete("_provider");

    switch (provider) {
      case "web3forms": {
        const accessKey = await getSecret("NEXT_PUBLIC_WEB3FORMS_KEY");
        if (!accessKey) {
          return NextResponse.json(
            { success: false, message: "Web3Forms not configured" },
            { status: 500 }
          );
        }

        body.append("access_key", accessKey);

        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: body,
        });

        const result = await response.json();
        return NextResponse.json(result);
      }

      case "formspree": {
        const formId = await getSecret("NEXT_PUBLIC_FORMSPREE_ID");
        if (!formId) {
          return NextResponse.json(
            { success: false, message: "Formspree not configured" },
            { status: 500 }
          );
        }

        // Formspree용으로 올바른 필드명을 가진 새 FormData 생성
        const formspreeData = new FormData();
        formspreeData.append("name", body.get("name") as string);
        formspreeData.append("email", body.get("email") as string);
        formspreeData.append("_replyto", body.get("email") as string); // 답장 기능용
        formspreeData.append("message", body.get("message") as string);

        // 제목 필드
        const subject = body.get("subject") as string;
        if (subject) {
          formspreeData.append("_subject", subject);
        }

        // 파일 업로드 처리
        const uploadFile = body.get("upload") as File | null;
        if (uploadFile && uploadFile.size > 0) {
          formspreeData.append("attachment", uploadFile);
        }

        const response = await fetch(`https://formspree.io/f/${formId}`, {
          method: "POST",
          body: formspreeData,
          headers: {
            Accept: "application/json",
          },
        });

        const responseText = await response.text();

        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          result = { error: responseText };
        }

        if (response.ok) {
          return NextResponse.json({ success: true, message: "Message sent successfully" });
        }

        return NextResponse.json({
          success: false,
          message: result.error || result.errors?.[0]?.message || "Failed to send",
        });
      }

      case "emailjs": {
        const serviceId = await getSecret("NEXT_PUBLIC_EMAILJS_SERVICE_ID");
        const templateId = await getSecret("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID");
        const publicKey = await getSecret("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY");

        if (!serviceId || !templateId || !publicKey) {
          return NextResponse.json(
            { success: false, message: "EmailJS not configured" },
            { status: 500 }
          );
        }

        // FormData를 템플릿 파라미터로 변환
        const templateParams: Record<string, string> = {
          from_name: body.get("name") as string,
          from_email: body.get("email") as string,
          message: body.get("message") as string,
          to_email: await getSecret("NEXT_PUBLIC_CONTACT_EMAIL") || "",
        };

        // EmailJS용 파일 첨부 처리 (base64)
        const file = body.get("file") as File | null;
        if (file && file.size > 0) {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const dataUrl = `data:${file.type};base64,${base64}`;
          templateParams.attachment = dataUrl;
          templateParams.attachment_name = file.name;
        }

        const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            service_id: serviceId,
            template_id: templateId,
            user_id: publicKey,
            template_params: templateParams,
          }),
        });

        if (response.ok) {
          return NextResponse.json({ success: true, message: "Message sent successfully" });
        }

        const errorText = await response.text();
        return NextResponse.json({
          success: false,
          message: errorText || "Failed to send",
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: "Invalid provider" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

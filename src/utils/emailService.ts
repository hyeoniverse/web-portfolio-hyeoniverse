import { siteConfig } from "@/config/site.config";

type EmailProvider = "web3forms" | "formspree" | "emailjs";

interface EmailData {
  name: string;
  email: string;
  message: string;
  file?: File | null;
}

interface EmailResult {
  success: boolean;
  message: string;
}

export const sendEmail = async (data: EmailData): Promise<EmailResult> => {
  const provider = siteConfig.emailService.provider as EmailProvider;

  const formData = new FormData();
  formData.append("_provider", provider);
  formData.append("name", data.name);
  formData.append("email", data.email);
  formData.append("message", data.message);
  formData.append("subject", `Portfolio Contact from ${data.name}`);

  // Add file based on provider's field name
  if (data.file && siteConfig.emailService.enableFileUpload) {
    if (provider === "formspree") {
      formData.append("upload", data.file);
    } else if (provider === "emailjs") {
      formData.append("file", data.file);
    } else {
      formData.append("attachment", data.file);
    }
  }

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    return {
      success: result.success,
      message: result.message || (result.success ? "Message sent successfully" : "Failed to send message"),
    };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

export const isFileUploadEnabled = (): boolean => {
  return siteConfig.emailService.enableFileUpload;
};

// Get max file size based on provider
export const getMaxFileSize = (): number => {
  const provider = siteConfig.emailService.provider as EmailProvider;

  switch (provider) {
    case "emailjs":
      return 500 * 1024; // 500KB
    case "formspree":
      return 10 * 1024 * 1024; // 10MB
    case "web3forms":
      return 10 * 1024 * 1024; // 10MB
    default:
      return 10 * 1024 * 1024;
  }
};

export const getEmailProvider = (): EmailProvider => {
  return siteConfig.emailService.provider as EmailProvider;
};

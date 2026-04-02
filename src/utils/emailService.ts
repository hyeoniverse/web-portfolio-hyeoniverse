import { siteConfig } from "@/config/site.config";

type EmailProvider = "web3forms" | "formspree" | "emailjs";

export const isFileUploadEnabled = (): boolean => {
  return siteConfig.emailService.enableFileUpload;
};

// 제공자에 따른 최대 파일 크기 반환
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

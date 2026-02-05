/**
 * =============================================================================
 * SITE CONFIGURATION
 * =============================================================================
 *
 * This is the main configuration file for your portfolio.
 * Edit the values below to customize the site with your own information.
 *
 * After editing, the changes will be reflected throughout the entire site.
 * =============================================================================
 */

export const siteConfig = {
  // ---------------------------------------------------------------------------
  // PERSONAL INFORMATION
  // ---------------------------------------------------------------------------
  personal: {
    name: "Kim JeongHyeon", // Your full name
    nickname: "HYEON", // Display name / nickname
    role: "Frontend Focused Fullstack Developer", // Your job title
    location: "Seoul, KR", // Your location
    status: "Open to Opportunities", // Current status (e.g., "Available for hire", "Open to work")
  },

  // ---------------------------------------------------------------------------
  // BRAND / SITE IDENTITY
  // ---------------------------------------------------------------------------
  brand: {
    name: "HYEONIVERSE", // Full brand name (used in nav, experience section)
    splitName: ["HYEONI", "VERSE"], // Brand name split for hero display
    tagline: "Creative Digital Agency",
  },

  // ---------------------------------------------------------------------------
  // CONTACT & SOCIAL LINKS
  // ---------------------------------------------------------------------------
  contact: {
    email: "hyeoniverse.dev@gmail.com", // Primary contact email
  },

  // ---------------------------------------------------------------------------
  // EMAIL SERVICE CONFIGURATION
  // ---------------------------------------------------------------------------
  // Choose your email service provider: "web3forms" | "formspree" | "emailjs"
  // Make sure to set the corresponding environment variables in .env.local
  //
  // For Web3Forms:
  //   NEXT_PUBLIC_WEB3FORMS_KEY=your_access_key
  //
  // For Formspree:
  //   NEXT_PUBLIC_FORMSPREE_ID=your_form_id
  //
  // For EmailJS:
  //   NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
  //   NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
  //   NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
  // ---------------------------------------------------------------------------
  emailService: {
    provider: "formspree" as "web3forms" | "formspree" | "emailjs",
    // File attachment support:
    // - Web3Forms: Paid plan only (up to 10MB)
    // - Formspree: Free (up to 10MB)
    // - EmailJS: Base64 encoded (up to 500KB)
    enableFileUpload: false,
  },

  // ---------------------------------------------------------------------------
  // RECAPTCHA CONFIGURATION
  // ---------------------------------------------------------------------------
  // version: "v3" (invisible, recommended) | "v2" (checkbox)
  // Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY in .env.local
  // Make sure to create the correct key type in Google reCAPTCHA console
  // ---------------------------------------------------------------------------
  recaptcha: {
    enabled: true,
    version: "v3" as "v2" | "v3",
  },

  social: {
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    blog: "https://velog.io",
    // Add more social links as needed:
    // twitter: "https://twitter.com/username",
    // instagram: "https://instagram.com/username",
  },

  // ---------------------------------------------------------------------------
  // SEO & METADATA
  // ---------------------------------------------------------------------------
  metadata: {
    title: "Hyeoniverse ✦ Portfolio",
    description:
      "Frontend developer creating interactive web experiences with React, Next.js, and TypeScript.",
    keywords:
      "frontend developer, portfolio, React, Next.js, TypeScript, web development, UI/UX",
    author: "Kim JeongHyeon",
    locale: "ko_KR",
  },

  // ---------------------------------------------------------------------------
  // SITE CONTENT
  // ---------------------------------------------------------------------------
  hero: {
    headline: ["Creative", "Developer", "& Designer"], // Main headline (each item = new line)
    subtext: ["Based in Seoul, KR", "Available for projects"],
  },

  cta: {
    label: "Open to Opportunities",
    title: ["Looking for", "someone?"],
    buttonText: "Get in touch",
  },

  footer: {
    copyright: `HYEON © ${new Date().getFullYear()}, All Rights Reserved`,
  },

  // ---------------------------------------------------------------------------
  // LOADING SCREEN
  // ---------------------------------------------------------------------------
  loading: {
    displayName: "HYEON", // Name shown on loading screen
  },
} as const;

// Type export for use in components
export type SiteConfig = typeof siteConfig;

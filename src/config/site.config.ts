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
    title: "HYEON | Portfolio",
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

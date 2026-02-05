/**
 * Portfolio Data Export
 *
 * This file exports portfolio data from the active configuration.
 * To switch between personal and example data, modify USE_EXAMPLE_DATA in config/portfolio.config.ts
 */

import { config } from "@/config";

// ============================================
// Bundled Data
// ============================================
export const portfolioData = {
  projects: config.projects,
  skills: config.skills,
  experiences: config.experiences,
  blogPosts: config.blogPosts,
};

// ============================================
// Individual Exports
// ============================================
export const projectsData = config.projects;
export const projectDetails = config.projectDetails;
export const skillsData = config.skills;
export const experiencesData = config.experiences;
export const blogPostsData = config.blogPosts;

// ============================================
// Filtered Experience Data
// ============================================
export const activityData = config.experiences.filter(
  (exp) => exp.type === "activity"
);

export const educationData = config.experiences.filter(
  (exp) => exp.type === "education"
);

export const achievementsData = config.experiences.filter(
  (exp) => exp.type === "achievement"
);

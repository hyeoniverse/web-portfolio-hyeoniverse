import type { Project, CardSize, LocalizedText } from "@/data/projects";

/** DB row shape — flat columns for ko/en */
export interface Work {
  id: string;
  number: string;
  title: string;
  subtitle_ko: string;
  subtitle_en: string;
  category_ko: string;
  category_en: string;
  year: string;
  description_ko: string;
  description_en: string;
  role_ko: string;
  role_en: string;
  tech: string[];
  image: string;
  size: CardSize;
  overview_ko: string;
  overview_en: string;
  challenge_ko: string;
  challenge_en: string;
  solution_ko: string;
  solution_en: string;
  gallery: string[];
  live_url: string;
  github_url: string;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Form data for create/update — omit auto-generated fields */
export type WorkFormData = Omit<Work, "id" | "created_at" | "updated_at">;

/** Convert DB Work row → front-end Project shape */
export function workToProject(w: Work): Project {
  const loc = (ko: string, en: string): LocalizedText => ({ ko, en });
  return {
    id: w.id,
    number: w.number,
    title: w.title,
    subtitle: loc(w.subtitle_ko, w.subtitle_en),
    category: loc(w.category_ko, w.category_en),
    year: w.year,
    description: loc(w.description_ko, w.description_en),
    role: loc(w.role_ko, w.role_en),
    tech: w.tech,
    image: w.image,
    size: w.size,
    overview: loc(w.overview_ko, w.overview_en),
    challenge: loc(w.challenge_ko, w.challenge_en),
    solution: loc(w.solution_ko, w.solution_en),
    gallery: w.gallery,
    liveUrl: w.live_url || undefined,
    githubUrl: w.github_url || undefined,
  };
}

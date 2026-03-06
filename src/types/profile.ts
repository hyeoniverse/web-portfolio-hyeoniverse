import type {
  DatePeriod,
  Experience,
  SkillGroup,
  Philosophy,
  ApproachStep,
  Certification,
  Award,
} from "@/data/profile";

export type { DatePeriod };

/** Profile data blob stored in site_settings.config JSONB */
export interface ProfileData {
  experiences: Experience[];
  skillGroups: SkillGroup[];
  philosophy: Philosophy[];
  approachSteps: ApproachStep[];
  certifications: Certification[];
  awards: Award[];
}

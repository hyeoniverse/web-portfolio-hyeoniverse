import {
  experiences as staticExp,
  skillGroups as staticSkills,
  philosophy as staticPhilo,
  approachSteps as staticApproach,
  certifications as staticCerts,
  awards as staticAwards,
} from "@/data/profile";
import type { ProfileData } from "@/types/profile";

export const profileDefaults: ProfileData = {
  experiences: staticExp,
  skillGroups: staticSkills,
  philosophy: staticPhilo,
  approachSteps: staticApproach,
  certifications: staticCerts,
  awards: staticAwards,
};

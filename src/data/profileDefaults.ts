import {
  experiences as staticExp,
  education as staticEducation,
  activities as staticActivities,
  skillGroups as staticSkills,
  philosophy as staticPhilo,
  approachSteps as staticApproach,
  certifications as staticCerts,
  awards as staticAwards,
  bunnyProfile as staticBunny,
  profileInfoBlocks as staticInfoBlocks,
} from "@/data/profile";
import type { ProfileData } from "@/types/profile";

export const profileDefaults: ProfileData = {
  experiences: staticExp,
  education: staticEducation,
  activities: staticActivities,
  skillGroups: staticSkills,
  philosophy: staticPhilo,
  approachSteps: staticApproach,
  certifications: staticCerts,
  awards: staticAwards,
  bunny: staticBunny,
  infoBlocks: staticInfoBlocks,
};

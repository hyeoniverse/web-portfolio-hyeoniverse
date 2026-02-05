import { create } from "zustand";
import { Project } from "@/types";
import { portfolioData } from "@/data";

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: portfolioData.projects,
  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),
}));

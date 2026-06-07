/// <reference types="vite/client" />

export interface ProjectValidation {
  ok: boolean;
  rootPath?: string;
  reason: string;
}

export interface ProjectForm {
  id: string;
  name: string;
  filePath: string;
  powers: string[];
}

export interface ProjectPower {
  id: string;
  name: string;
  type: string;
  filePath: string;
}

export interface ProjectData {
  validation: ProjectValidation;
  forms: ProjectForm[];
  powers: ProjectPower[];
}

export interface CreatePowerResult {
  ok: boolean;
  reason?: string;
  power?: ProjectPower;
}

declare global {
  interface Window {
    ssc?: {
      selectProject: () => Promise<{ canceled: boolean; validation: ProjectValidation }>;
      validateProject: (rootPath: string) => Promise<ProjectValidation>;
      getProjectData: (rootPath: string) => Promise<ProjectData>;
      createPower: (payload: {
        rootPath: string;
        formId?: string;
        powerName: string;
      }) => Promise<CreatePowerResult>;
      minimizeWindow: () => Promise<void>;
      toggleMaximizeWindow: () => Promise<boolean>;
      closeWindow: () => Promise<void>;
    };
  }
}
